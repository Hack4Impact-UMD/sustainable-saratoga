import { type } from "arktype";
import type { UserRole } from "@common/user.ts";

export type InviteFailure = { email: string; reason: string };

const emailAddress = type("string.email");

export function validateInviteEmails(
  emails: string[],
  role: UserRole,
): { emails: string[] } | { failures: InviteFailure[] } {
  const addresses = emails.map((email) => ({
    email,
    address: email.trim().toLowerCase(),
  }));
  const counts = new Map<string, number>();
  for (const { address } of addresses) {
    counts.set(address, (counts.get(address) ?? 0) + 1);
  }
  const failures: InviteFailure[] = [];

  for (const { email, address } of addresses) {
    let reason: string;
    if (!emailAddress.allows(address)) {
      reason = "Enter a valid email address.";
    } else if ((counts.get(address) ?? 0) > 1) {
      reason = "This email address appears more than once.";
    } else if (
      role === "admin" &&
      !address.endsWith("@sustainablesaratoga.org")
    ) {
      reason = "Admin invites require a Sustainable Saratoga email address.";
    } else {
      continue;
    }
    failures.push({ email, reason });
  }

  return failures.length > 0
    ? { failures }
    : { emails: addresses.map(({ address }) => address) };
}
