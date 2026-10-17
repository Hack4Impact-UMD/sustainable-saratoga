import { type } from "arktype"
import type { Session } from "./session"

export const userRole = type(
    "'admin' | 'planter' | 'pruner'"
);

export const userProfile = type({
    firstName: "string > 0",
    lastName: "string > 0",
    email: "string.email",
});

export const getUserInput = type({
    uid: "string > 0"
});



export type UserRole = typeof userRole.infer;
export type UserProfile = typeof userProfile.infer;
export type GetUserInput = typeof getUserInput.infer;
export type CurrentUser = { session: Session; profile: UserProfile | null };

