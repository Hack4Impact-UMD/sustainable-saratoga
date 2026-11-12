import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type {
  DocumentSnapshot,
  Firestore,
  QuerySnapshot,
} from "firebase-admin/firestore";
import {
  invitation,
  issuedInvitation,
  validateInviteEmails,
} from "@repo/common";
import type { InviteFailure, UserRole } from "@repo/common";
import { deliverInvites } from "@backend/services/inviteDelivery.ts";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type InviteResult =
  | { ok: true; count: number }
  | { ok: false; failures: InviteFailure[] };

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

function inviteMessage(email: string) {
  return { email, token: randomBytes(32).toString("base64url") };
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
  const failures = activeMemberFailures(validation.emails, await users.get());
  if (failures.length > 0) return { ok: false, failures };

  const messages = validation.emails.map(inviteMessage);
  const deliveryFailures = await deliverInvites(messages);
  if (deliveryFailures.length > 0)
    return { ok: false, failures: deliveryFailures };

  const invites = db.collection("invitations");
  const now = Date.now();
  return db.runTransaction(async (transaction): Promise<InviteResult> => {
    const [members, pending] = await Promise.all([
      transaction.get(users),
      transaction.get(invites.where("status", "==", "pending")),
    ]);
    const conflicts = activeMemberFailures(validation.emails, members);
    if (conflicts.length > 0) return { ok: false, failures: conflicts };

    for (const { email, token } of messages) {
      const [existing, ...duplicates] = pending.docs.filter(
        (doc) => invitation.assert(doc.data()).email.toLowerCase() === email,
      );
      transaction.set(
        existing?.ref ?? invites.doc(),
        issuedInvitation.assert({
          email,
          role,
          status: "pending",
          tokenHash: hashInviteToken(token),
          invitedBy,
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + WEEK_MS).toISOString(),
        }),
      );
      for (const duplicate of duplicates) transaction.delete(duplicate.ref);
    }

    return { ok: true, count: messages.length };
  });
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
  const snapshot = await ref.get();
  const invite = readInvite(snapshot);
  if (invite.status !== "pending") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Only pending invites can be resent.",
    });
  }

  const validation = validateInviteEmails([invite.email], invite.role);
  if ("failures" in validation)
    return { ok: false, failures: validation.failures };
  const [email] = validation.emails;
  if (!email) throw new Error("Invite validation returned no address.");
  const message = inviteMessage(email);
  const failures = await deliverInvites([message]);
  if (failures.length > 0) return { ok: false, failures };

  const replacement = issuedInvitation.assert({
    ...invite,
    email,
    tokenHash: hashInviteToken(message.token),
    expiresAt: new Date(Date.now() + WEEK_MS).toISOString(),
  });
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    if (
      !current.updateTime ||
      !snapshot.updateTime?.isEqual(current.updateTime)
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "The invite changed during delivery.",
      });
    }
    transaction.set(ref, replacement);
  });
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
