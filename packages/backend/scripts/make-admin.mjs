// Makes an existing account an admin.
//
//   pnpm --filter @repo/backend exec node scripts/make-admin.mjs <email>
//
// Local emulators:  FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
//                   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
//                   GCLOUD_PROJECT=demo-sustainable-saratoga node scripts/make-admin.mjs <email>
// Production:       GOOGLE_APPLICATION_CREDENTIALS=<service account key> \
//                   GCLOUD_PROJECT=sustainable-saratoga node scripts/make-admin.mjs <email>
//
// The person must have signed up first, so a profile exists.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/make-admin.mjs <email>");
  process.exit(1);
}

initializeApp();

try {
  const { uid } = await getAuth().getUserByEmail(email);
  const ref = getFirestore().collection("users").doc(uid);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new Error(`${email} has no profile yet. Have them sign up first.`);
  }

  await ref.update({
    role: "admin",
    status: "active",
    // admin profiles can't carry volunteerTypes
    volunteerTypes: FieldValue.delete(),
    removedAt: FieldValue.delete(),
    removedBy: FieldValue.delete(),
  });
  await getAuth().updateUser(uid, { disabled: false });
  console.log(`${email} (${uid}) is now an admin.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
