import type { Auth } from "firebase-admin/auth";
import { FieldPath } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";

const MAX_AUTH_SYNCS = 8;

function record(data: unknown): Record<string, unknown> {
  return data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : {};
}

function authRevision(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

export function bumpedAuthRevision(data: unknown) {
  return authRevision(record(data).authRevision) + 1;
}

/** Resolve current intent with its invitation in the same transaction. */
function currentIntent(db: Firestore, uid: string) {
  const ref = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const member = await tx.get(ref);
    if (!member.exists) return null;
    const data = record(member.data());
    let disabled = data.status === "removed";
    const unlock = record(data.authUnlock);
    const inviteId =
      typeof data.restorationInviteId === "string"
        ? data.restorationInviteId
        : unlock.inviteId;
    if (disabled && typeof inviteId === "string") {
      const invite = await tx.get(db.collection("invitations").doc(inviteId));
      const sent = Date.parse(
        invite.get("lastSentAt") ?? invite.get("createdAt"),
      );
      const removed = Date.parse(String(data.removedAt));
      const emailMatches =
        typeof data.email === "string" &&
        String(invite.get("email")).toLowerCase() === data.email.toLowerCase();
      const accepted =
        invite.get("status") === "accepted" &&
        invite.get("acceptedBy") === uid &&
        invite.get("restorationProfile") &&
        data.restorationInviteId === inviteId;
      const pending =
        invite.get("status") === "pending" &&
        unlock.inviteId === inviteId &&
        unlock.removedAt === data.removedAt &&
        typeof unlock.tokenHash === "string" &&
        unlock.tokenHash === invite.get("tokenHash") &&
        Date.parse(invite.get("expiresAt")) > Date.now();
      disabled = !(emailMatches && sent > removed && (accepted || pending));
    }
    return { data, disabled, revision: authRevision(data.authRevision) };
  });
}

/**
 * Projects the profile's Auth bit onto Firebase Auth.
 *
 * Firestore and Firebase Auth are not one transaction, and an Auth update
 * cannot be fenced: a request issued earlier can finish later and overwrite a
 * newer one. Each caller therefore writes, then reads the profile again, and
 * writes the latest decision if this attempt is obsolete. That repairs a late
 * write whose caller is still running.
 *
 * It does not stop a request that lands after every caller has already
 * returned. `authRevision` lets a later sync tell that the profile moved.
 * Calling this again (removal retry, restoration retry, or another finalizer
 * pass) repairs Auth once that late request has landed.
 */
export async function syncMemberAuth(db: Firestore, auth: Auth, uid: string) {
  const ref = db.collection("users").doc(uid);
  for (let attempt = 0; attempt < MAX_AUTH_SYNCS; attempt++) {
    const before = await currentIntent(db, uid);
    if (!before) return;
    const { disabled, revision } = before;
    await auth.updateUser(uid, { disabled });
    const removedAt = before.data.removedAt;
    if (
      before.data.status === "removed" &&
      typeof removedAt === "string" &&
      before.data.authRevokedRemoval !== removedAt
    ) {
      await auth.revokeRefreshTokens(uid);
      await db.runTransaction(async (tx) => {
        const latest = await tx.get(ref);
        if (
          record(latest.data()).removedAt === removedAt &&
          record(latest.data()).status === "removed"
        ) {
          tx.update(ref, { authRevokedRemoval: removedAt });
        }
      });
    }
    const after = await currentIntent(db, uid);
    if (!after) return;
    if (after.revision !== revision || after.disabled !== disabled) continue;
    if (typeof auth.getUser === "function") {
      const account = await auth.getUser(uid);
      if (
        typeof account.disabled === "boolean" &&
        account.disabled !== disabled
      ) {
        continue;
      }
    }
    return;
  }
  throw new Error("Firebase Auth did not match the member profile.");
}

/** Rechecks completed accounts too: an old Auth request may land after acknowledgement. */
export async function reconcileMemberAuth(db: Firestore, auth: Auth) {
  let cursor: string | undefined;
  let failures = 0;
  let checked = 0;
  while (true) {
    const query = db
      .collection("users")
      .orderBy(FieldPath.documentId())
      .limit(100);
    const page = await (cursor ? query.startAfter(cursor) : query).get();
    for (let offset = 0; offset < page.docs.length; offset += 5) {
      await Promise.all(
        page.docs.slice(offset, offset + 5).map(async (snapshot) => {
          if (
            snapshot.get("authRevision") === undefined &&
            snapshot.get("status") !== "removed" &&
            !snapshot.get("restorationInviteId")
          )
            return;
          try {
            if (snapshot.get("restorationInviteId")) {
              const { finishInviteRestoration } =
                await import("@backend/services/inviteAcceptance.ts");
              await finishInviteRestoration(
                db,
                auth,
                snapshot.get("restorationInviteId"),
              );
            }
            await syncMemberAuth(db, auth, snapshot.id);
            checked++;
          } catch (error) {
            failures++;
            const code =
              error && typeof error === "object" && "code" in error
                ? String(error.code)
                : "unknown";
            console.error("Member Auth reconciliation failed", { code });
          }
        }),
      );
    }
    if (page.docs.length < 100) break;
    cursor = page.docs.at(-1)?.id;
  }
  console.warn("Member Auth reconciliation", { checked, failures });
  if (failures) throw new Error("Member Auth reconciliation incomplete.");
}
