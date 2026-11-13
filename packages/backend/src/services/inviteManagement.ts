import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { FieldValue } from "firebase-admin/firestore";
import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";
import { invitation } from "@repo/common";
import type { Person } from "@repo/common";
import {
  deliverInvite,
  inviteEmail,
  InviteDeliveryRejected,
} from "@backend/services/inviteDelivery.ts";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
// Leave margin inside Resend's 24-hour idempotency window.
const DELIVERY_RETRY_MS = 23 * 60 * 60 * 1000;

type ResendOperation = {
  token: string;
  startedAt: number;
  leaseUntil: number;
  sentAt?: string;
};

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
  const emulator = process.env.FUNCTIONS_EMULATOR === "true";
  const { invite, operation, isFirstAttempt } = await db.runTransaction(
    async (transaction) => {
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
          message:
            "Admin invites require a Sustainable Saratoga email address.",
        });
      }

      const now = Date.now();
      const previous = snapshot.get("resendOperation") as
        | ResendOperation
        | undefined;
      if (previous && previous.leaseUntil > now) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This invite is already being resent.",
        });
      }
      if (
        previous &&
        !previous.sentAt &&
        now - previous.startedAt >= DELIVERY_RETRY_MS
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Delivery could not be confirmed within the retry window.",
        });
      }

      // Firestore denies client access. Keep the token only until finalization
      // so a retry can send the same email under the same idempotency key.
      const operation: ResendOperation = {
        ...(previous ?? {
          token: randomBytes(32).toString("base64url"),
          startedAt: now,
        }),
        leaseUntil: now + 60_000,
      };
      transaction.update(ref, { resendOperation: operation });
      return { invite: pending, operation, isFirstAttempt: !previous };
    },
  );
  const { token } = operation;
  const tokenHash = hashInviteToken(token);
  let lastSentAt = operation.sentAt;

  try {
    if (!lastSentAt) {
      if (!emulator) await deliverInvite(invite.email, token, tokenHash);
      const acceptedAt = new Date().toISOString();
      lastSentAt = acceptedAt;
      await db.runTransaction(async (transaction) => {
        const current = await transaction.get(ref);
        const active = current.get("resendOperation") as
          | ResendOperation
          | undefined;
        if (
          current.get("status") !== "pending" ||
          active?.token !== token ||
          active.leaseUntil !== operation.leaseUntil
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "The invite changed during delivery.",
          });
        }
        transaction.update(ref, {
          resendOperation: { ...operation, sentAt: acceptedAt },
        });
      });
    }
    const sentAt = lastSentAt;
    const expiresAt = new Date(
      Date.parse(sentAt) + INVITE_LIFETIME_MS,
    ).toISOString();
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (
        current.get("status") === "pending" &&
        current.get("tokenHash") === tokenHash
      )
        return;
      const active = current.get("resendOperation") as
        | ResendOperation
        | undefined;
      if (
        current.get("status") !== "pending" ||
        active?.token !== token ||
        active.leaseUntil !== operation.leaseUntil
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The invite changed during delivery.",
        });
      }
      transaction.update(ref, {
        tokenHash,
        lastSentAt: sentAt,
        expiresAt,
        resendOperation: FieldValue.delete(),
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
          sentAt,
        });
      }
    });
  } catch (error) {
    await db
      .runTransaction(async (transaction) => {
        const current = await transaction.get(ref);
        const active = current.get("resendOperation") as
          | ResendOperation
          | undefined;
        if (
          active?.token !== token ||
          active.leaseUntil !== operation.leaseUntil
        )
          return;
        const rejected = error instanceof InviteDeliveryRejected;
        // Once a previous attempt was ambiguous, a later rejection does not
        // prove it never delivered. Preserve the original operation in that case.
        transaction.update(ref, {
          resendOperation:
            rejected && isFirstAttempt
              ? FieldValue.delete()
              : { ...active, leaseUntil: 0 },
        });
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
    invitedAt: lastSentAt,
    expiresAt: new Date(
      Date.parse(lastSentAt) + INVITE_LIFETIME_MS,
    ).toISOString(),
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
        resendOperation: FieldValue.delete(),
      });
    }
  });
  return { ok: true as const };
}
