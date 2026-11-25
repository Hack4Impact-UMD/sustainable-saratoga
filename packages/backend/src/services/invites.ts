import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { Auth } from "firebase-admin/auth";
import type {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  QuerySnapshot,
} from "firebase-admin/firestore";
import {
  invitation,
  issuedInvitation,
  userProfile,
  validateInviteEmails,
} from "@repo/common";
import type {
  AcceptInviteInput,
  Invitation,
  InviteFailure,
  UserProfile,
  UserRole,
} from "@repo/common";
import { deliverInvites } from "@backend/services/inviteDelivery.ts";
import type { InviteMessage } from "@backend/services/inviteDelivery.ts";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type InviteResult =
  | { ok: true; count: number }
  | { ok: false; failures: InviteFailure[] };

/**
 * How to undo one write if delivery fails.
 * ourHash is the token hash we wrote; null means we deleted the doc.
 * previous is what the doc held before (null if we created it).
 */
type Undo = {
  ref: DocumentReference;
  previous: Invitation | null;
  ourHash: string | null;
};

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function activeMemberFailures(
  emails: string[],
  users: QuerySnapshot,
): InviteFailure[] {
  const active = new Set<string>();
  for (const user of users.docs) {
    const { email, status } = user.data();
    if (
      typeof email === "string" &&
      (status === "active" || status === undefined)
    ) {
      active.add(email.toLowerCase());
    }
  }
  return emails
    .filter((email) => active.has(email))
    .map((email) => ({
      email,
      reason: "This email already belongs to an active member.",
    }));
}

function inviteMessage(email: string): InviteMessage {
  return { email, token: randomBytes(32).toString("base64url") };
}

/**
 * Reverts saved invites after a failed delivery. Anything that changed in the
 * meantime (a cancel, an accept, a newer send) is left alone.
 */
async function rollback(db: Firestore, undo: Undo[]): Promise<void> {
  await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(
      undo.map(({ ref }) => transaction.get(ref)),
    );
    undo.forEach(({ ref, previous, ourHash }, index) => {
      const snapshot = snapshots[index];
      if (!snapshot) return;
      if (ourHash === null) {
        // We deleted a duplicate; put it back only if it is still gone.
        if (!snapshot.exists && previous) transaction.set(ref, previous);
        return;
      }
      const current = snapshot.exists
        ? invitation.assert(snapshot.data())
        : null;
      if (current?.status !== "pending" || current.tokenHash !== ourHash)
        return;
      if (previous) transaction.set(ref, previous);
      else transaction.delete(ref);
    });
  });
}

async function deliverOrRollback(
  db: Firestore,
  messages: InviteMessage[],
  undo: Undo[],
): Promise<InviteFailure[]> {
  let failures: InviteFailure[];
  try {
    failures = await deliverInvites(messages);
  } catch (error) {
    await rollback(db, undo);
    throw error;
  }
  if (failures.length > 0) await rollback(db, undo);
  return failures;
}

export async function sendInvites(
  db: Firestore,
  invitedBy: string,
  emails: string[],
  role: UserRole,
): Promise<InviteResult> {
  const validation = validateInviteEmails(emails, role);
  if ("failures" in validation)
    return { ok: false, failures: validation.failures };

  const users = db.collection("users");
  const invites = db.collection("invitations");
  const messages = validation.emails.map(inviteMessage);
  const now = Date.now();
  const saved = await db.runTransaction(
    async (
      transaction,
    ): Promise<{ failures: InviteFailure[] } | { undo: Undo[] }> => {
      const [members, pending] = await Promise.all([
        transaction.get(users),
        transaction.get(invites.where("status", "==", "pending")),
      ]);
      const conflicts = activeMemberFailures(validation.emails, members);
      if (conflicts.length > 0) return { failures: conflicts };

      const undo: Undo[] = [];
      for (const { email, token } of messages) {
        const [existing, ...duplicates] = pending.docs.filter(
          (doc) => invitation.assert(doc.data()).email.toLowerCase() === email,
        );
        const ref = existing?.ref ?? invites.doc();
        const tokenHash = hashInviteToken(token);
        transaction.set(
          ref,
          issuedInvitation.assert({
            email,
            role,
            status: "pending",
            tokenHash,
            invitedBy,
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + WEEK_MS).toISOString(),
          }),
        );
        undo.push({
          ref,
          previous: existing ? invitation.assert(existing.data()) : null,
          ourHash: tokenHash,
        });
        for (const duplicate of duplicates) {
          transaction.delete(duplicate.ref);
          undo.push({
            ref: duplicate.ref,
            previous: invitation.assert(duplicate.data()),
            ourHash: null,
          });
        }
      }
      return { undo };
    },
  );
  if ("failures" in saved) return { ok: false, failures: saved.failures };

  const failures = await deliverOrRollback(db, messages, saved.undo);
  if (failures.length > 0) return { ok: false, failures };
  return { ok: true, count: messages.length };
}

function readInvite(snapshot: DocumentSnapshot) {
  if (!snapshot.exists) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." });
  }
  return invitation.assert(snapshot.data());
}

export async function resendInvite(
  db: Firestore,
  inviteId: string,
): Promise<InviteResult> {
  const ref = db.collection("invitations").doc(inviteId);

  // Save the new token first, so the emailed link is already valid.
  const saved = await db.runTransaction(
    async (
      transaction,
    ): Promise<
      | { failures: InviteFailure[] }
      | { message: InviteMessage; previous: Invitation }
    > => {
      const invite = readInvite(await transaction.get(ref));
      if (invite.status !== "pending") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Only pending invites can be resent.",
        });
      }
      const validation = validateInviteEmails([invite.email], invite.role);
      if ("failures" in validation) return { failures: validation.failures };
      const [email] = validation.emails;
      if (!email) throw new Error("Invite validation returned no address.");

      const message = inviteMessage(email);
      transaction.set(
        ref,
        issuedInvitation.assert({
          ...invite,
          email,
          tokenHash: hashInviteToken(message.token),
          expiresAt: new Date(Date.now() + WEEK_MS).toISOString(),
        }),
      );
      return { message, previous: invite };
    },
  );
  if ("failures" in saved) return { ok: false, failures: saved.failures };

  const failures = await deliverOrRollback(
    db,
    [saved.message],
    [
      {
        ref,
        previous: saved.previous,
        ourHash: hashInviteToken(saved.message.token),
      },
    ],
  );
  if (failures.length > 0) return { ok: false, failures };
  return { ok: true, count: 1 };
}

export async function cancelInvite(
  db: Firestore,
  inviteId: string,
): Promise<{ ok: true }> {
  const ref = db.collection("invitations").doc(inviteId);
  await db.runTransaction(async (transaction) => {
    const invite = readInvite(await transaction.get(ref));
    if (invite.status === "accepted") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Accepted invites cannot be canceled.",
      });
    }
    if (invite.status === "pending")
      transaction.update(ref, { status: "canceled" });
  });
  return { ok: true };
}

/**
 * Finds the invite an emailed link points to. Links carry the raw token, and
 * only its hash is stored, so a leaked database can't be used to sign up.
 */
function inviteByToken(db: Firestore, token: string): Query {
  return db
    .collection("invitations")
    .where("tokenHash", "==", hashInviteToken(token))
    .limit(1);
}

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
  const snapshot = await inviteByToken(db, token).get();
  const [match] = snapshot.docs;

  if (!match) {
    return { status: "expired" };
  }

  const invite = invitation.assert(match.data());
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
  const inviteQuery = inviteByToken(db, input.token);
  const userRef = db.collection("users").doc(uid);

  let shouldEnableAccount = false;

  await db.runTransaction(async (transaction) => {
    const [inviteSnapshot, userSnapshot] = await Promise.all([
      transaction.get(inviteQuery),
      transaction.get(userRef),
    ]);
    const [match] = inviteSnapshot.docs;

    if (!match) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invitation not found.",
      });
    }

    const invite = invitation.assert(match.data());

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

      profile =
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

      shouldEnableAccount = true;
      transaction.set(userRef, profile);
    } else {
      profile =
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

      transaction.create(userRef, profile);
    }

    transaction.update(match.ref, { status: "accepted" });
  });

  // Firebase Auth is outside Firestore transactions.
  // Re-enable only after the profile and invitation update succeeds.
  if (shouldEnableAccount) {
    await auth.updateUser(uid, { disabled: false });
  }
}
