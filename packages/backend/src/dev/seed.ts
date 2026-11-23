import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { invitation, treeDocument, userProfile } from "@repo/common";
import type { Invitation, TreeDocument, UserProfile } from "@repo/common";
import { treeAddressKey } from "@backend/services/records.ts";

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

interface SeedTreeGroup {
  key: string;
  count: number;
  nextTreeNumber: number;
}

interface SeedTreeResult {
  records: TreeDocument[];
  groups: SeedTreeGroup[];
}

export function seedTreeRecords(now: Date = new Date()): SeedTreeResult {
  const iso = (offsetDays: number) =>
    new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000).toISOString();

  // Addresses — the two-tree address shares address/city/state.
  const mapleAddr = {
    address: "12 Maple Hollow Ln",
    city: "Saratoga Springs",
    state: "NY",
  };
  const mapleKey = treeAddressKey(mapleAddr);

  const birchAddr = {
    address: "48 Birchfield Ave",
    city: "Saratoga Springs",
    state: "NY",
  };
  const birchKey = treeAddressKey(birchAddr);

  const lanternAddr = {
    address: "7 Lantern Ct",
    city: "Saratoga Springs",
    state: "NY",
  };
  const lanternKey = treeAddressKey(lanternAddr);

  const orchardAddr = {
    address: "115 Orchard Row",
    city: "Saratoga Springs",
    state: "NY",
  };
  const orchardKey = treeAddressKey(orchardAddr);

  const recordBase = {
    zip: null,
    species: null,
    scientificName: null,
    cultivar: null,
    responsibleMemberUid: ADMIN_UID,
    location: {
      ownership: null,
      description: null,
    },
    siteAssessment: {
      exposure: null,
      wireConflict: null,
      treeLawnRowSpace: null,
      ifNotInRow: null,
      overheadUtilities: null,
      undergroundUtilities: null,
      crown: null,
      preparationRequired: null,
      nextSteps: null,
    },
    plantingPreparation: {
      spotFlagged: null,
      readyToPlant: null,
      comingSoonSign: null,
      utilityMarked: null,
      roots: null,
      needToPlant: null,
      notes: null,
    },
    photos: [],
    contacts: {
      treeHost: null,
      propertyOwner: null,
      email: null,
      phone: null,
    },
    eventPlantingDetails: {
      event: null,
      year: null,
      treeTogaNumber: null,
      plantingDate: null,
      yearPlanted: null,
      plantedBy: null,
    },
  };

  // Record 1: requested — single-tree address
  const rec1 = treeDocument.assert({
    ...recordBase,
    id: "A1B2-C3D4",
    origin: "requested",
    status: "requested",
    ...mapleAddr,
    addressKey: mapleKey,
    treeNumber: 1,
    lat: 43.0831,
    lng: -73.7845,
    species: "Sugar maple",
    recordInformation: {
      createdAt: iso(-10),
      createdBy: ADMIN_UID,
      lastEditedAt: iso(-10),
      lastEditedBy: ADMIN_UID,
    },
  });

  // Record 2: possible — single-tree address
  const rec2 = treeDocument.assert({
    ...recordBase,
    id: "E5F6-A7B8",
    origin: "possible",
    status: "possible",
    ...birchAddr,
    addressKey: birchKey,
    treeNumber: 1,
    lat: 43.0788,
    lng: -73.7814,
    species: "River birch",
    recordInformation: {
      createdAt: iso(-8),
      createdBy: ADMIN_UID,
      lastEditedAt: iso(-8),
      lastEditedBy: ADMIN_UID,
    },
  });

  // Record 3: approved
  const rec3 = treeDocument.assert({
    ...recordBase,
    id: "C9D0-E1F2",
    origin: "requested",
    status: "approved",
    ...lanternAddr,
    addressKey: lanternKey,
    treeNumber: 1,
    lat: 43.0812,
    lng: -73.7871,
    species: "White oak",
    recordInformation: {
      createdAt: iso(-15),
      createdBy: ADMIN_UID,
      lastEditedAt: iso(-5),
      lastEditedBy: ADMIN_UID,
    },
  });

  // Record 4: planted (two-tree address, treeNumber: 1)
  const rec4 = treeDocument.assert({
    ...recordBase,
    id: "3A4B-5C6D",
    origin: "requested",
    status: "planted",
    ...orchardAddr,
    addressKey: orchardKey,
    treeNumber: 1,
    lat: 43.0766,
    lng: -73.7902,
    species: "Eastern white pine",
    eventPlantingDetails: {
      event: null,
      year: 2024,
      treeTogaNumber: null,
      plantingDate: iso(-30),
      yearPlanted: 2024,
      plantedBy: "seed-planter",
    },
    recordInformation: {
      createdAt: iso(-60),
      createdBy: ADMIN_UID,
      lastEditedAt: iso(-30),
      lastEditedBy: ADMIN_UID,
    },
  });

  // Record 5: planted (two-tree address, treeNumber: 2)
  const rec5 = treeDocument.assert({
    ...recordBase,
    id: "7E8F-9A0B",
    origin: "requested",
    status: "planted",
    ...orchardAddr,
    addressKey: orchardKey,
    treeNumber: 2,
    lat: 43.0766,
    lng: -73.7902,
    species: "American elm",
    eventPlantingDetails: {
      event: null,
      year: 2024,
      treeTogaNumber: null,
      plantingDate: iso(-28),
      yearPlanted: 2024,
      plantedBy: "seed-planter",
    },
    recordInformation: {
      createdAt: iso(-58),
      createdBy: ADMIN_UID,
      lastEditedAt: iso(-28),
      lastEditedBy: ADMIN_UID,
    },
  });

  const records = [rec1, rec2, rec3, rec4, rec5];

  const groups: SeedTreeGroup[] = [
    { key: mapleKey, count: 1, nextTreeNumber: 2 },
    { key: birchKey, count: 1, nextTreeNumber: 2 },
    { key: lanternKey, count: 1, nextTreeNumber: 2 },
    { key: orchardKey, count: 2, nextTreeNumber: 3 },
  ];

  return { records, groups };
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
 * Writes the seed accounts, invites, and tree records. Safe to run again:
 * accounts keep fixed uids, so a rerun resets them instead of adding
 * duplicates.
 */
export async function seed(
  db: Firestore,
  auth: Auth,
  now: Date = new Date(),
): Promise<{ users: number; invitations: number; trees: number }> {
  const users = seedUsers(now);
  const invitations = seedInvitations(now);
  const { records, groups } = seedTreeRecords(now);

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

  for (const record of records) {
    await db.collection("trees").doc(record.id).set(record);
  }

  for (const { key, count, nextTreeNumber } of groups) {
    await db
      .collection("treeAddresses")
      .doc(key)
      .set({ count, nextTreeNumber });
  }

  return {
    users: users.length,
    invitations: invitations.length,
    trees: records.length,
  };
}
