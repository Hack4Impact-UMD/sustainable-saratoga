import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { SEED_PASSWORD, seed, seedUsers } from "@backend/dev/seed.ts";

/**
 * Entry point bundled and run by `scripts/seed.mjs`, which sets the emulator
 * hosts before this runs. Not part of the deployed functions bundle.
 */
const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const { users, invitations } = await seed(getFirestore(app), getAuth(app));

console.warn(
  [
    `Seeded ${users} accounts and ${invitations} invites (password: ${SEED_PASSWORD})`,
    ...seedUsers().map(
      ({ profile, disabled }) =>
        `  ${profile.email.padEnd(32)} ${profile.role}${disabled ? " (removed)" : ""}`,
    ),
  ].join("\n"),
);
