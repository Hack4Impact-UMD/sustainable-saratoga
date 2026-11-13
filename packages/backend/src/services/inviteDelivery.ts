import { TRPCError } from "@trpc/server";

export function inviteEmail(email: string, token: string, origin: string) {
  const link = new URL(`/invite/${token}`, origin).href;
  return {
    to: [email],
    subject: "You’re invited to Tree Tracker",
    text: `Accept your Tree Tracker invitation: ${link}\n\nThis link expires in 7 days.`,
  };
}

/** Sends from the configured domain. The emulator uses a local mail collection. */
export async function deliverInvite(email: string, token: string) {
  const { INVITE_MAIL_API_KEY, INVITE_MAIL_FROM, INVITE_APP_ORIGIN } =
    process.env;
  if (
    !INVITE_MAIL_API_KEY ||
    !INVITE_MAIL_FROM ||
    !INVITE_APP_ORIGIN?.startsWith("https://")
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Invite email delivery is not configured.",
    });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${INVITE_MAIL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: INVITE_MAIL_FROM,
      ...inviteEmail(email, token, INVITE_APP_ORIGIN),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "The email provider rejected the invitation.",
    });
  }
}
