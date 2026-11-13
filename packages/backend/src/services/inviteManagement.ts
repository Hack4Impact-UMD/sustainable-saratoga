import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { FieldValue } from "firebase-admin/firestore";
import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import { invitation } from "@repo/common";
import type { Person } from "@repo/common";
import {
  deliverInvite,
  inviteEmail,
} from "@backend/services/inviteDelivery.ts";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function readInvite(snapshot: DocumentSnapshot) {
  if (!snapshot.exists) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." });
  }
  return invitation.assert(snapshot.data());
}

export async function resendInvite(db: Firestore, inviteId: string) {
  const ref = db.collection("invitations").doc(inviteId);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashInviteToken(token);
  const emulator = process.env.FUNCTIONS_EMULATOR === "true";
  const invite = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const pending = readInvite(snapshot);
    if (pending.status !== "pending") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Only pending invites can be resent.",
      });
    }
    if (
      pending.role === "admin" &&
      !pending.email.toLowerCase().endsWith("@sustainablesaratoga.org")
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Admin invites require a Sustainable Saratoga email address.",
      });
    }

    const now = Date.now();
    const leaseExpiresAt = snapshot.get("resendLease.expiresAt");
    if (typeof leaseExpiresAt === "number" && leaseExpiresAt > now) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This invite is already being resent.",
      });
    }
    transaction.update(ref, {
      resendLease: { tokenHash, expiresAt: now + 60_000 },
    });
    return pending;
  });

  let sentAt: Date;
  try {
    if (!emulator) await deliverInvite(invite.email, token);
    sentAt = new Date();
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (
        current.get("status") !== "pending" ||
        current.get("resendLease.tokenHash") !== tokenHash
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The invite changed during delivery.",
        });
      }

      const lastSentAt = sentAt.toISOString();
      transaction.update(ref, {
        tokenHash,
        lastSentAt,
        expiresAt: new Date(
          sentAt.getTime() + INVITE_LIFETIME_MS,
        ).toISOString(),
        resendLease: FieldValue.delete(),
      });
      if (emulator) {
        const { to, ...message } = inviteEmail(
          invite.email,
          token,
          process.env.INVITE_APP_ORIGIN ?? "http://localhost:5173",
        );
        transaction.create(db.collection("inviteTestMail").doc(), {
          to,
          message,
          inviteId,
          sentAt: lastSentAt,
        });
      }
    });
  } catch (error) {
    // A failed cleanup leaves a short lease so a retry can still recover.
    await db
      .runTransaction(async (transaction) => {
        const current = await transaction.get(ref);
        if (current.get("resendLease.tokenHash") === tokenHash) {
          transaction.update(ref, { resendLease: FieldValue.delete() });
        }
      })
      .catch(() => {});
    throw error;
  }

  const person: Person = {
    id: inviteId,
    name: [invite.firstName, invite.lastName].filter(Boolean).join(" "),
    email: invite.email,
    role: invite.role,
    status: "pending",
    invitedAt: sentAt.toISOString(),
    expiresAt: new Date(sentAt.getTime() + INVITE_LIFETIME_MS).toISOString(),
    isSelf: false,
  };
  return { person };
}

export async function cancelInvite(db: Firestore, inviteId: string) {
  const ref = db.collection("invitations").doc(inviteId);
  await db.runTransaction(async (transaction) => {
    const invite = readInvite(await transaction.get(ref));
    if (invite.status === "accepted") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Accepted invites cannot be canceled.",
      });
    }
    if (invite.status === "pending") {
      transaction.update(ref, {
        status: "canceled",
        resendLease: FieldValue.delete(),
      });
    }
  });
  return { ok: true as const };
}
