import type { Firestore } from "firebase-admin/firestore";
import { userProfile } from "@repo/common";
import type { UserProfile } from "@repo/common";

// Reads users/{uid}; returns null if no profile exists yet
export async function getUserProfile(
  db: Firestore,
  uid: string,
): Promise<UserProfile | null> {
  const snapshot = await db.collection("users").doc(uid).get();
  return snapshot.exists ? userProfile.assert(snapshot.data()) : null;
}
