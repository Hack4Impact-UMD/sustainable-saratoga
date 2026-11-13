import type { Auth } from "firebase-admin/auth";
import type { DocumentReference, Firestore } from "firebase-admin/firestore";

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

/**
 * Auth disabled bit implied by the profile. Active wins over a stale flag.
 * A removed profile can still ask for sign-in (`desiredAuthDisabled: false`)
 * while acceptance is finishing or a replacement invite unlocked the account.
 * Profiles written before `status` existed stay active.
 */
export function projectedAuthDisabled(data: unknown) {
  const profile = record(data);
  if (profile.status !== "removed") return false;
  if (typeof profile.desiredAuthDisabled === "boolean") {
    return profile.desiredAuthDisabled;
  }
  return true;
}

export function bumpedAuthRevision(data: unknown) {
  return authRevision(record(data).authRevision) + 1;
}

/** Records the Auth bit the next sync must project. Active profiles stay enabled. */
export async function setDesiredAuthDisabled(
  db: Firestore,
  userRef: DocumentReference,
  disabled: boolean,
) {
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists) return;
    const data = record(snapshot.data());
    if (data.status !== "removed") return;
    if (data.desiredAuthDisabled === disabled) return;
    transaction.update(userRef, {
      desiredAuthDisabled: disabled,
      authRevision: authRevision(data.authRevision) + 1,
    });
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
    const before = await ref.get();
    if (!before.exists) return;
    const beforeData = record(before.data());
    const disabled = projectedAuthDisabled(beforeData);
    const revision = authRevision(beforeData.authRevision);
    await auth.updateUser(uid, { disabled });
    const after = await ref.get();
    const afterData = record(after.data());
    if (authRevision(afterData.authRevision) !== revision) continue;
    if (projectedAuthDisabled(afterData) !== disabled) continue;
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
