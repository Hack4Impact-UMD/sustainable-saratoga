import type { Firestore } from "firebase-admin/firestore";
import type { CreateUserInput, Session, UserProfile } from "@repo/common";

// Reads users/{uid}; returns null if no profile exists yet
export function getUserProfile(
  _db: Firestore,
  _uid: string,
): Promise<UserProfile | null> {
  return Promise.reject(new Error("not implemented"));
}

// Writes users/{uid} for the signed-in user as a volunteer with their selected volunteer types
export function createUserProfile(
  _db: Firestore,
  _session: Session,
  _input: CreateUserInput,
): Promise<UserProfile> {
  return Promise.reject(new Error("not implemented"));
}
