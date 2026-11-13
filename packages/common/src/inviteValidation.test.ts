import { expect, it } from "vitest";
import { validateInviteEmails } from "@common/inviteValidation.ts";

it("lowercases and trims valid emails", () => {
  expect(validateInviteEmails([" A@Example.com "], "volunteer")).toEqual({
    emails: ["a@example.com"],
  });
});

it("flags invalid emails", () => {
  expect(validateInviteEmails(["nope", "a@example.com"], "volunteer")).toEqual({
    failures: [{ email: "nope", reason: "Enter a valid email address." }],
  });
});

it("flags every copy of a duplicate, ignoring case", () => {
  const result = validateInviteEmails(["a@example.com", "A@example.com"], "volunteer");
  expect("failures" in result && result.failures.map((f) => f.email)).toEqual([
    "a@example.com",
    "A@example.com",
  ]);
});

it("allows admin only for org emails", () => {
  expect(validateInviteEmails(["x@sustainablesaratoga.org"], "admin")).toEqual({
    emails: ["x@sustainablesaratoga.org"],
  });
  const result = validateInviteEmails(
    ["x@sustainablesaratoga.org", "y@example.com"],
    "admin",
  );
  expect("failures" in result && result.failures.map((f) => f.email)).toEqual([
    "y@example.com",
  ]);
});

it("rejects look-alike org domains", () => {
  expect(
    "failures" in validateInviteEmails(["x@evil-sustainablesaratoga.org"], "admin"),
  ).toBe(true);
});