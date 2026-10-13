import { type } from "arktype";
import type { Session } from "@common/session.ts";

export const userRoleSchema = type("'member' | 'admin'");
export type UserRole = typeof userRoleSchema.infer;

// uid, email, and role are NOT inputs: the server takes uid/email from ctx.session and sets role itself.
export const createUserInput = type({
  "displayName?": "string > 0",
});
export type CreateUserInput = typeof createUserInput.infer;

export const getUserInput = type({
  uid: "string > 0",
});
export type GetUserInput = typeof getUserInput.infer;

// Shape of the Firestore doc at users/{uid}
export interface UserProfile {
  uid: string;
  email: string | null; // matches Session.email
  displayName?: string;
  role: UserRole;
  createdAt: string; // ISO string
}

// Return type of users.me: the verified session plus the profile (null until create is called)
export interface CurrentUser {
  session: Session;
  profile: UserProfile | null;
}