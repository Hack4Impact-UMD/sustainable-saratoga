import { TRPCError } from "@trpc/server";

export function inviteEmail(email: string, token: string, origin: string) {
  const link = new URL(`/invite/${token}`, origin).href;
  return {
    to: [email],
    subject: "You’re invited to Tree Tracker",
    text: `Accept your Tree Tracker invitation: ${link}\n\nThis link expires in 7 days.`,
  };
}

/** The provider definitively refused this request before accepting delivery. */
export class InviteDeliveryRejected extends TRPCError {}

/** Sends from the configured domain. The emulator uses a local mail collection. */
export async function deliverInvite(
  email: string,
  token: string,
  operationId: string,
) {
  const { INVITE_MAIL_API_KEY, INVITE_MAIL_FROM, INVITE_APP_ORIGIN } =
    process.env;
  if (
    !INVITE_MAIL_API_KEY ||
    !INVITE_MAIL_FROM ||
    !INVITE_APP_ORIGIN?.startsWith("https://")
  ) {
    throw new InviteDeliveryRejected({
      code: "PRECONDITION_FAILED",
      message: "Invite email delivery is not configured.",
    });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${INVITE_MAIL_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `tree-tracker-invite/${operationId}`,
    },
    body: JSON.stringify({
      from: INVITE_MAIL_FROM,
      ...inviteEmail(email, token, INVITE_APP_ORIGIN),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Concurrent requests and transient failures can leave delivery uncertain.
    const DeliveryError = [400, 401, 403, 404, 422].includes(response.status)
      ? InviteDeliveryRejected
      : TRPCError;
    throw new DeliveryError({
      code: "BAD_GATEWAY",
      message: "The email provider rejected the invitation.",
    });
  }
}
