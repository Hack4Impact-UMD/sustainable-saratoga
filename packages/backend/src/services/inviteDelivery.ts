import type { InviteFailure } from "@repo/common";

export type InviteMessage = { email: string; token: string };

// The provider and emulator transport plug in here.
export function deliverInvites(
  messages: InviteMessage[],
): Promise<InviteFailure[]> {
  return Promise.resolve(
    messages.map(({ email }) => ({
      email,
      reason: "Invite email delivery is not configured.",
    })),
  );
}
