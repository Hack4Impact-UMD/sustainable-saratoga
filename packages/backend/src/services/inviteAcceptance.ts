import { TRPCError } from "@trpc/server";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { invitation, userProfile } from "@repo/common";
import type { AcceptInviteInput, Invitation, UserProfile } from "@repo/common";
import { hashInviteToken } from "@backend/services/inviteManagement.ts";

export type CheckInviteResult =
  | { status: "valid"; email: string; role: Invitation["role"] }
  | { status: "expired" | "used" | "canceled"; email?: string };

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
  return getInviteStatus(invite, now);
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
  auth: Auth,
  uid: string,
  email: string,
  input: AcceptInviteInput,
  now = new Date(),
): Promise<void> {
  const snapshot = await findInvite(db, input.token);
  if (!snapshot) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invitation not found.",
    });
  }
  const inviteRef = snapshot.ref;
  const userRef = db.collection("users").doc(uid);

  let shouldEnableAccount = false;

  await db.runTransaction(async (transaction) => {
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

    if (invite.status === "accepted") {
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

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This invitation belongs to a different email address.",
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

    if (userSnapshot.exists) {
      const existingProfile = userProfile.assert({
        uid,
        ...userSnapshot.data(),
      });

      if (existingProfile.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account already exists with a different email.",
        });
      }

      if (existingProfile.status !== "removed") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account already exists for this user.",
        });
      }

      shouldEnableAccount = true;
      transaction.set(userRef, profile);
    } else {
      transaction.create(userRef, profile);
    }

    transaction.update(inviteRef, { status: "accepted" });
  });

  // Firebase Auth is outside Firestore transactions.
  // Re-enable only after the profile and invitation update succeeds.
  if (shouldEnableAccount) {
    await auth.updateUser(uid, { disabled: false });
  }
}
