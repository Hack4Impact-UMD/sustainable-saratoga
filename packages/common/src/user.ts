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

// "removed" users are locked out but their profile stays, so records remain credited to them
export const userStatus = type("'active' | 'removed'");

const profileBase = {
  firstName: nonEmptyTrimmed,
  lastName: nonEmptyTrimmed,
  email: "string.email",
  // profiles written before this field existed read back as active
  status: userStatus.default("active"),
  // ISO timestamp and the admin's uid, set only when status is "removed"
  "removedAt?": "string",
  "removedBy?": "string",
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
export type UserStatus = typeof userStatus.infer;
export type UserRole = typeof userRole.infer;
export type UserProfile = typeof userProfile.infer;
export type GetUserInput = typeof getUserInput.infer;
export type CurrentUser = { session: Session; profile: UserProfile | null };
