import { type } from "arktype";
import type { Session } from "@common/session.ts";

export const userRole = type("'admin' | 'planter' | 'pruner'");

// trim first so whitespace-only names count as empty
const nonEmptyTrimmed = type("string.trim").to("string > 0");

export const userProfile = type({
  firstName: nonEmptyTrimmed,
  lastName: nonEmptyTrimmed,
  email: "string.email",
});

export const getUserInput = type({
  uid: "string > 0",
});

export type UserRole = typeof userRole.infer;
export type UserProfile = typeof userProfile.infer;
export type GetUserInput = typeof getUserInput.infer;
export type CurrentUser = { session: Session; profile: UserProfile | null };
