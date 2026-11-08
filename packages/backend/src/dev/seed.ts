import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { invitation, userProfile } from "@repo/common";
import type { Invitation, UserProfile } from "@repo/common";

/**
 * Mock accounts and invites for the local emulators. `pnpm dev` loads them on
 * every start (see `scripts/seed.mjs`), and `pnpm seed` reloads them. Never
 * run against production: the script forces the emulator hosts.
 */

/** Every seeded account signs in with this password. */
export const SEED_PASSWORD = "password123";

export interface SeedUser {
  uid: string;
  profile: UserProfile;
  /** Disabled in Auth, like an account an admin removed. */
  disabled: boolean;
}

export interface SeedInvitation {
  id: string;
  data: Invitation;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFrom = (now: Date, days: number) =>
  new Date(now.getTime() + days * DAY_MS).toISOString();

const ADMIN_UID = "seed-admin";

export function seedUsers(now: Date = new Date()): SeedUser[] {
  return [
    {
      uid: ADMIN_UID,
      disabled: false,
      profile: {
        firstName: "Ada",
        lastName: "Admin",
        email: "admin@example.com",
        role: "admin",
        status: "active",
      },
    },
    {
      uid: "seed-admin-2",
      disabled: false,
      profile: {
        firstName: "Sam",
        lastName: "Steward",
        email: "admin2@example.com",
        role: "admin",
        status: "active",
      },
    },
    {
      uid: "seed-planter",
      disabled: false,
      profile: {
        firstName: "Pat",
        lastName: "Planter",
        email: "planter@example.com",
        role: "volunteer",
        status: "active",
        volunteerTypes: ["planter"],
      },
    },
    {
      uid: "seed-pruner",
      disabled: false,
      profile: {
        firstName: "Riley",
        lastName: "Pruner",
        email: "pruner@example.com",
        role: "volunteer",
        status: "active",
        volunteerTypes: ["pruner"],
      },
    },
    {
      uid: "seed-both",
      disabled: false,
      profile: {
        firstName: "Jordan",
        lastName: "Both",
        email: "both@example.com",
        role: "volunteer",
        status: "active",
        volunteerTypes: ["planter", "pruner"],
      },
    },
    {
      uid: "seed-removed",
      disabled: true,
      profile: {
        firstName: "Remo",
        lastName: "Removed",
        email: "removed@example.com",
        role: "volunteer",
        status: "removed",
        volunteerTypes: ["planter"],
        removedAt: daysFrom(now, -7),
        removedBy: ADMIN_UID,
      },
    },
  ];
}

export function seedInvitations(now: Date = new Date()): SeedInvitation[] {
  const invite = (
    id: string,
    fields: Pick<Invitation, "email" | "role" | "status">,
    createdDaysAgo: number,
    expiresInDays: number,
  ): SeedInvitation => ({
    id,
    data: {
      ...fields,
      createdAt: daysFrom(now, -createdDaysAgo),
      expiresAt: daysFrom(now, expiresInDays),
      invitedBy: ADMIN_UID,
    },
  });

  return [
    invite(
      "seed-invite-pending",
      { email: "invitee@example.com", role: "volunteer", status: "pending" },
      2,
      5,
    ),
    invite(
      "seed-invite-admin",
      {
        email: "newadmin@example.com",
        role: "admin",
        status: "pending",
      },
      1,
      6,
    ),
    invite(
      "seed-invite-expired",
      { email: "expired@example.com", role: "volunteer", status: "pending" },
      10,
      -3,
    ),
    invite(
      "seed-invite-canceled",
      { email: "canceled@example.com", role: "volunteer", status: "canceled" },
      4,
      3,
    ),
    invite(
      "seed-invite-accepted",
      { email: "planter@example.com", role: "volunteer", status: "accepted" },
      20,
      -13,
    ),
  ];
}

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

/**
 * Writes the seed accounts and invites. Safe to run again: accounts keep
 * fixed uids, so a rerun resets them instead of adding duplicates.
 */
export async function seed(
  db: Firestore,
  auth: Auth,
  now: Date = new Date(),
): Promise<{ users: number; invitations: number }> {
  const users = seedUsers(now);
  const invitations = seedInvitations(now);

  for (const { uid, profile, disabled } of users) {
    // fail loudly if the seed data drifts from the schema
    userProfile.assert(profile);

    const account = {
      email: profile.email,
      password: SEED_PASSWORD,
      displayName: `${profile.firstName} ${profile.lastName}`,
      emailVerified: true,
      disabled,
    };
    try {
      await auth.updateUser(uid, account);
    } catch (error) {
      if (!hasCode(error, "auth/user-not-found")) throw error;
      await auth.createUser({ uid, ...account });
    }
    await db.collection("users").doc(uid).set(profile);
  }

  for (const { id, data } of invitations) {
    invitation.assert(data);
    await db.collection("invitations").doc(id).set(data);
  }

  return { users: users.length, invitations: invitations.length };
}
