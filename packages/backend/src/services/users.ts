import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";
import { userProfile } from "@repo/common";
import type { CreateUserInput, Session, UserProfile } from "@repo/common";

// Firestore's gRPC status for create() on a document that already exists
const ALREADY_EXISTS = 6;

// Reads users/{uid}; returns null if no profile exists yet
export async function getUserProfile(
  db: Firestore,
  uid: string,
): Promise<UserProfile | null> {
  const snapshot = await db.collection("users").doc(uid).get();
  return snapshot.exists ? userProfile.assert(snapshot.data()) : null;
}

// Writes users/{uid} for the signed-in user as a volunteer with their selected volunteer types
export async function createUserProfile(
  db: Firestore,
  session: Session,
  input: CreateUserInput,
): Promise<UserProfile> {
  if (!session.email) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A profile needs an account with an email address.",
    });
  }

  const profile: UserProfile = {
    ...input,
    email: session.email,
    role: "volunteer",
    status: "active",
  };

  try {
    // create() rather than set(), so this can't overwrite an existing profile
    // and turn an admin back into a volunteer
    await db.collection("users").doc(session.uid).create(profile);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === ALREADY_EXISTS
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This account already has a profile.",
      });
    }
    throw error;
  }

  return profile;
}
