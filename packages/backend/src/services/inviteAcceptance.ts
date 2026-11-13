import { TRPCError } from "@trpc/server";
import type { Auth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { invitation, userProfile } from "@repo/common";
import type { AcceptInviteInput, Invitation, UserProfile } from "@repo/common";
import { hashInviteToken } from "@backend/services/inviteManagement.ts";
import {
  bumpedAuthRevision,
  syncMemberAuth,
} from "@backend/services/memberAuth.ts";

export type CheckInviteResult =
  | {
      status: "valid";
      email: string;
      role: Invitation["role"];
      canRestoreSignIn: boolean;
    }
  | { status: "expired" | "used" | "canceled" | "restoring"; email?: string };

function getInviteStatus(invite: Invitation, now: Date): CheckInviteResult {
  if (invite.status === "canceled") {
    return { status: "canceled", email: invite.email };
  }

  if (invite.status === "accepted") {
    return { status: "used", email: invite.email };
  }

  if (new Date(invite.expiresAt).getTime() <= now.getTime()) {
    return { status: "expired", email: invite.email };
  }

  return {
    status: "valid",
    email: invite.email,
    role: invite.role,
    canRestoreSignIn: false,
  };
}

export async function checkInvite(
  db: Firestore,
  token: string,
  now = new Date(),
): Promise<CheckInviteResult> {
  const snapshot = await findInvite(db, token);

  if (!snapshot) {
    return { status: "expired" };
  }

  const invite = invitation.assert(snapshot.data());
  const result = getInviteStatus(invite, now);
  if (result.status === "used" && snapshot.get("restorationProfile")) {
    return { status: "restoring" };
  }
  if (result.status === "valid" && invite.tokenHash) {
    const member = await findRemovedMember(db, invite);
    result.canRestoreSignIn = Boolean(member);
  }
  return result;
}

async function findRemovedMember(db: Firestore, invite: Invitation) {
  const matches = await db
    .collection("users")
    .where("email", "==", invite.email)
    .get();
  return matches.docs.find((member) => {
    const profile = userProfile.assert(member.data());
    return (
      profile.status === "removed" &&
      profile.removedAt !== undefined &&
      Date.parse(invite.lastSentAt ?? invite.createdAt) >
        Date.parse(profile.removedAt)
    );
  });
}

/** A replacement invite proves email possession and can unlock sign-in only.
 * The profile stays removed until the matching signed-in user accepts it.
 */
export async function restoreInviteSignIn(
  db: Firestore,
  auth: Auth,
  token: string,
) {
  const snapshot = await findInvite(db, token);
  if (!snapshot)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invitation not found.",
    });
  const invite = invitation.assert(snapshot.data());
  if (
    !invite.tokenHash ||
    getInviteStatus(invite, new Date()).status !== "valid"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "A current replacement invitation is required.",
    });
  }
  const member = await findRemovedMember(db, invite);
  if (!member)
    throw new TRPCError({
      code: "CONFLICT",
      message: "Sign-in restoration is not available.",
    });
  const user = await auth.getUser(member.id);
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The account email does not match the invitation.",
    });
  }
  // Persist the unlock before Auth so a competing finalizer projects enabled
  // instead of disabling this account again.
  await db.runTransaction(async (tx) => {
    const [latestInvite, latestMember] = await Promise.all([
      tx.get(snapshot.ref),
      tx.get(member.ref),
    ]);
    const current = invitation.assert(latestInvite.data());
    if (
      !latestMember.exists ||
      latestMember.get("status") !== "removed" ||
      latestMember.get("removedAt") !== member.get("removedAt") ||
      current.tokenHash !== hashInviteToken(token) ||
      getInviteStatus(current, new Date()).status !== "valid" ||
      current.email !== invite.email ||
      Date.parse(current.lastSentAt ?? current.createdAt) <=
        Date.parse(latestMember.get("removedAt"))
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "The account or invitation changed. Try again.",
      });
    }
    tx.update(member.ref, {
      desiredAuthDisabled: false,
      authUnlock: {
        inviteId: snapshot.id,
        tokenHash: current.tokenHash,
        removedAt: latestMember.get("removedAt"),
        expiresAt: current.expiresAt,
      },
      authRevision: bumpedAuthRevision(latestMember.data()),
    });
  });
  await syncMemberAuth(db, auth, member.id);
  const [currentInvite, currentMember] = await db.runTransaction((tx) =>
    Promise.all([tx.get(snapshot.ref), tx.get(member.ref)]),
  );
  const matchingRestoration =
    currentMember.get("removedAt") === member.get("removedAt") &&
    currentInvite.get("tokenHash") === invite.tokenHash &&
    currentInvite.get("status") === "accepted" &&
    currentInvite.get("acceptedBy") === member.id &&
    currentInvite.get("restorationProfile") &&
    currentMember.get("restorationInviteId") === snapshot.id;
  if (
    currentMember.get("status") === "removed" &&
    !matchingRestoration &&
    (currentMember.get("removedAt") !== member.get("removedAt") ||
      currentInvite.get("status") !== "pending" ||
      currentInvite.get("tokenHash") !== invite.tokenHash)
  ) {
    await syncMemberAuth(db, auth, member.id);
    throw new TRPCError({
      code: "CONFLICT",
      message: "The account or invitation changed. Try again.",
    });
  }
}

async function findInvite(db: Firestore, token: string) {
  const invites = db.collection("invitations");
  const byHash = await invites
    .where("tokenHash", "==", hashInviteToken(token))
    .limit(1)
    .get();
  if (byHash.docs[0]) return byHash.docs[0];

  // Legacy invitations used the document ID as the link token.
  const legacy = await invites.doc(token).get();
  return legacy.exists && !legacy.get("tokenHash") ? legacy : undefined;
}

export async function acceptInvite(
  db: Firestore,
  uid: string,
  email: string,
  input: AcceptInviteInput,
  now = new Date(),
) {
  const snapshot = await findInvite(db, input.token);
  if (!snapshot) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invitation not found.",
    });
  }
  const inviteRef = snapshot.ref;
  const userRef = db.collection("users").doc(uid);

  return db.runTransaction(async (transaction) => {
    const [inviteSnapshot, userSnapshot] = await Promise.all([
      transaction.get(inviteRef),
      transaction.get(userRef),
    ]);

    if (!inviteSnapshot.exists) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invitation not found.",
      });
    }

    const invite = invitation.assert(inviteSnapshot.data());

    if (invite.tokenHash && invite.tokenHash !== hashInviteToken(input.token)) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invitation not found.",
      });
    }

    if (invite.status === "canceled") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This invitation was canceled.",
      });
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This invitation belongs to a different email address.",
      });
    }

    const existing = userSnapshot.exists
      ? userProfile.assert(userSnapshot.data())
      : null;
    if (existing && existing.email.toLowerCase() !== email.toLowerCase()) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An account already exists with a different email.",
      });
    }
    if (invite.status === "accepted") {
      if (invite.acceptedBy === uid && existing?.status === "active") {
        return { status: "accepted" as const };
      }
      if (
        invite.acceptedBy === uid &&
        existing?.restorationInviteId === inviteRef.id
      ) {
        return { status: "restoring" as const };
      }
      throw new TRPCError({
        code: "CONFLICT",
        message: "This invitation has already been used.",
      });
    }

    if (new Date(invite.expiresAt).getTime() <= now.getTime()) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This invitation has expired.",
      });
    }

    if (existing?.status === "active") {
      if (existing.role !== invite.role) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This account already has a different role.",
        });
      }
      transaction.update(inviteRef, {
        status: "accepted",
        acceptedBy: uid,
        resendOperation: FieldValue.delete(),
      });
      return { status: "accepted" as const };
    }
    if (existing?.restorationInviteId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Access restoration is already pending.",
      });
    }

    const profile: UserProfile =
      invite.role === "admin"
        ? {
            firstName: input.firstName,
            lastName: input.lastName,
            email: invite.email,
            role: "admin",
            status: "active",
          }
        : {
            firstName: input.firstName,
            lastName: input.lastName,
            email: invite.email,
            role: "volunteer",
            status: "active",
            volunteerTypes: input.volunteerTypes ?? ["planter"],
          };

    if (existing) {
      if (
        existing.removedAt &&
        Date.parse(invite.lastSentAt ?? invite.createdAt) <=
          Date.parse(existing.removedAt)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invite predates the removal. Ask for a new link.",
        });
      }
      // Keep the profile removed until the Firebase Auth operation succeeds.
      transaction.update(userRef, {
        restorationInviteId: inviteRef.id,
        desiredAuthDisabled: false,
        authRevision: bumpedAuthRevision(userSnapshot.data()),
      });
      transaction.update(inviteRef, {
        status: "accepted",
        acceptedBy: uid,
        restorationProfile: profile,
        resendOperation: FieldValue.delete(),
      });
      return { status: "restoring" as const };
    }

    transaction.create(userRef, profile);
    transaction.update(inviteRef, {
      status: "accepted",
      acceptedBy: uid,
      resendOperation: FieldValue.delete(),
    });
    return { status: "accepted" as const };
  });
}

/** The Firestore trigger retries this operation without the member's session. */
export async function finishInviteRestoration(
  db: Firestore,
  auth: Auth,
  inviteId: string,
) {
  const inviteRef = db.collection("invitations").doc(inviteId);
  const snapshot = await inviteRef.get();
  const uid = snapshot.get("acceptedBy");
  const restoration = snapshot.get("restorationProfile");
  if (snapshot.get("status") !== "accepted" || typeof uid !== "string") return;

  // Retries must repair a late Auth write even after successful acceptance
  // cleared its payload and a subsequent removal revoked access again.
  if (!restoration) {
    await syncMemberAuth(db, auth, uid);
    return;
  }

  userProfile.assert(restoration);
  const userRef = db.collection("users").doc(uid);
  const member = await userRef.get();
  if (!member.exists || member.get("status") !== "removed") {
    // A newer acceptance may already be active while this older Auth disable
    // is still in flight. Project the current profile, then look again.
    if (member.exists) await syncMemberAuth(db, auth, uid);
    return;
  }
  if (member.get("restorationInviteId") !== inviteId) {
    // No marker means removal won, but a newer invite can restore the same
    // account before a disable issued here reaches Firebase Auth.
    if (!member.get("restorationInviteId")) {
      await syncMemberAuth(db, auth, uid);
    }
    return;
  }

  await syncMemberAuth(db, auth, uid);
  await db.runTransaction(async (transaction) => {
    const [currentInvite, currentMember] = await Promise.all([
      transaction.get(inviteRef),
      transaction.get(userRef),
    ]);
    if (
      currentMember.get("status") === "removed" &&
      currentMember.get("restorationInviteId") === inviteId
    ) {
      if (
        currentInvite.get("status") === "accepted" &&
        String(currentInvite.get("email")).toLowerCase() ===
          String(currentMember.get("email")).toLowerCase() &&
        currentInvite.get("acceptedBy") === uid &&
        currentMember.get("removedAt") === member.get("removedAt") &&
        Date.parse(
          currentInvite.get("lastSentAt") ?? currentInvite.get("createdAt"),
        ) > Date.parse(currentMember.get("removedAt")) &&
        currentInvite.get("restorationProfile")
      ) {
        transaction.set(userRef, {
          ...userProfile.assert(currentInvite.get("restorationProfile")),
          ...(currentMember.get("authRevokedRemoval")
            ? { authRevokedRemoval: currentMember.get("authRevokedRemoval") }
            : {}),
          authRevision: bumpedAuthRevision(currentMember.data()),
          desiredAuthDisabled: false,
        });
        transaction.update(inviteRef, {
          restorationProfile: FieldValue.delete(),
        });
        return "restored";
      }
    }
    return currentMember.get("status") === "active" ? "active" : "removed";
  });
  // A later removal wins, including when it raced the Auth update above.
  // Sync after that write so a delayed enable cannot outlive the removal.
  await syncMemberAuth(db, auth, uid);
}
