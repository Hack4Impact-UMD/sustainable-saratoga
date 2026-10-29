import { type } from "arktype";
import { nonEmptyTrimmed } from "@common/fields.ts";
import type { Session } from "@common/session.ts";

// what a volunteer does; one volunteer can do both
export const volunteerType = type("'planter' | 'pruner'");

// at least one, no repeats
export const volunteerTypes = volunteerType
  .array()
  .atLeastLength(1)
  .narrow(
    (types, ctx) =>
      new Set(types).size === types.length ||
      ctx.reject({ message: "Volunteer types must not repeat" }),
  );

// admins are invite-only; everyone who signs up is a volunteer
export const userRole = type("'admin' | 'volunteer'");

const profileBase = {
  firstName: nonEmptyTrimmed,
  lastName: nonEmptyTrimmed,
  email: "string.email",
} as const;

// only volunteers carry volunteerTypes
export const userProfile = type({
  ...profileBase,
  role: "'admin'",
  "volunteerTypes?": "never",
}).or({
  ...profileBase,
  role: "'volunteer'",
  volunteerTypes,
});

export const getUserInput = type({
  uid: "string > 0",
});

export type VolunteerType = typeof volunteerType.infer;
export type UserRole = typeof userRole.infer;
export type UserProfile = typeof userProfile.infer;
export type GetUserInput = typeof getUserInput.infer;
export type CurrentUser = { session: Session; profile: UserProfile | null };
