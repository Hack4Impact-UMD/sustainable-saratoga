import { type } from "arktype";
import { nonEmptyTrimmed } from "@common/fields.ts";
import type { Session } from "@common/session.ts";

// roles volunteers can pick at sign-up; admins are invite-only
export const volunteerRole = type("'planter' | 'pruner'");

export const userRole = type("'admin'").or(volunteerRole);

export const userProfile = type({
  firstName: nonEmptyTrimmed,
  lastName: nonEmptyTrimmed,
  email: "string.email",
  role: userRole,
});

export const getUserInput = type({
  uid: "string > 0",
});

export type VolunteerRole = typeof volunteerRole.infer;
export type UserRole = typeof userRole.infer;
export type UserProfile = typeof userProfile.infer;
export type GetUserInput = typeof getUserInput.infer;
export type CurrentUser = { session: Session; profile: UserProfile | null };
