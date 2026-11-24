import type { InviteFailure } from "@repo/common";

export type InviteMessage = { email: string; token: string };

const DELIVERY_FAILED = "Delivery failed.";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function inviteLink(token: string, appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/invite/${encodeURIComponent(token)}`;
}

async function sendOne(
  { email, token }: InviteMessage,
  apiKey: string,
  appUrl: string,
): Promise<InviteFailure | null> {
  const link = inviteLink(token, appUrl);
  const failure = { email, reason: DELIVERY_FAILED };
  // Try twice: the second attempt only happens after a 429 (rate limited).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.INVITE_FROM_EMAIL,
          to: [email],
          subject: "You're invited to Sustainable Saratoga",
          text: `You've been invited to join Sustainable Saratoga.\n\nAccept your invite: ${link}\n\nThis link can be used once and expires in 7 days.`,
          html: `<p>You've been invited to join Sustainable Saratoga.</p><p><a href="${link}">Accept your invite</a></p><p>This link can be used once and expires in 7 days.</p>`,
        }),
      });
      if (response.ok) return null;
      if (response.status === 429 && attempt === 0) {
        await sleep(1000);
        continue;
      }
      console.error(`Invite email to ${email} failed: ${response.status}`);
      return failure;
    } catch (error) {
      console.error(`Invite email to ${email} failed:`, error);
      return failure;
    }
  }
  return failure;
}

export async function deliverInvites(
  messages: InviteMessage[],
): Promise<InviteFailure[]> {
  const emulator = process.env.FUNCTIONS_EMULATOR === "true";
  const appUrl =
    process.env.APP_URL || (emulator ? "http://localhost:5173" : "");

  if (emulator) {
    // No email on the emulator: print the link so it can be opened by hand.
    for (const { email, token } of messages) {
      console.warn(`[invite] ${email}: ${inviteLink(token, appUrl)}`);
    }
    return [];
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !appUrl || !process.env.INVITE_FROM_EMAIL) {
    return messages.map(({ email }) => ({
      email,
      reason: "Email delivery is not configured.",
    }));
  }

  // One at a time with a short pause, to stay under Resend's rate limit.
  const failures: InviteFailure[] = [];
  for (const [index, message] of messages.entries()) {
    if (index > 0) await sleep(500);
    const failure = await sendOne(message, apiKey, appUrl);
    if (failure) failures.push(failure);
  }
  return failures;
}
