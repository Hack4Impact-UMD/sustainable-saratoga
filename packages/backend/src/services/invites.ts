import { TRPCError } from "@trpc/server";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { invitation, userProfile } from "@repo/common";
import type {
  AcceptInviteInput,
  Invitation,
  UserProfile,
} from "@repo/common";

export type CheckInviteResult =
  | { status: "valid"; email: string; role: Invitation["role"] }
  | { status: "expired" | "used" | "canceled" };

function getInviteStatus(invite: Invitation, now: Date): CheckInviteResult {
  if (invite.status === "canceled") {
    return { status: "canceled" };
  }

  if (invite.status === "accepted") {
    return { status: "used" };
  }

  if (new Date(invite.expiresAt).getTime() <= now.getTime()) {
    return { status: "expired" };
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
  const snapshot = await db.collection("invitations").doc(token).get();

  if (!snapshot.exists) {
    return { status: "expired" };
  }

  const invite = invitation.assert(snapshot.data());
  return getInviteStatus(invite, now);
}

export async function acceptInvite(
  db: Firestore,
  auth: Auth,
  uid: string,
  email: string,
  input: AcceptInviteInput,
  now = new Date(),
): Promise<void> {
  const inviteRef = db.collection("invitations").doc(input.token);
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

    let profile: UserProfile;

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

      if (invite.role === "admin") {
        profile = {
            firstName: input.firstName,
            lastName: input.lastName,
            email: invite.email,
            role: "admin",
            status: "active",
        };
    } else {
        profile = {
            firstName: input.firstName,
            lastName: input.lastName,
            email: invite.email,
            role: "volunteer",
            status: "active",
            volunteerTypes: input.volunteerTypes ?? ["planter"],
    };
}

      shouldEnableAccount = true;
      transaction.set(userRef, profile);
    } else {
        if (invite.role === "admin") {
            profile = {
                firstName: input.firstName,
                lastName: input.lastName,
                email: invite.email,
                role: "admin",
                status: "active",
            };
        } else {
            profile = {
                firstName: input.firstName,
                lastName: input.lastName,
                email: invite.email,
                role: "volunteer",
                status: "active",
                volunteerTypes: input.volunteerTypes ?? ["planter"],
            };
    }

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