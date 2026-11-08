import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { invitation, userProfile } from "@repo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SEED_PASSWORD,
  seed,
  seedInvitations,
  seedUsers,
} from "@backend/dev/seed.ts";

const now = new Date("2026-06-01T00:00:00.000Z");

const set = vi.fn<(data: unknown) => Promise<void>>();
const doc = vi.fn<(id: string) => { set: typeof set }>(() => ({ set }));
const collection = vi.fn<(name: string) => { doc: typeof doc }>(() => ({
  doc,
}));
const db = { collection } as unknown as Firestore;

const updateUser = vi.fn<(uid: string, data: unknown) => Promise<void>>();
const createUser = vi.fn<(data: unknown) => Promise<void>>();
const auth = { updateUser, createUser } as unknown as Auth;

beforeEach(() => {
  vi.resetAllMocks();
  doc.mockReturnValue({ set });
  collection.mockReturnValue({ doc });
});

describe("seed data", () => {
  it("matches the user profile schema", () => {
    for (const { profile } of seedUsers(now)) {
      expect(() => userProfile.assert(profile)).not.toThrow();
    }
  });

  it("matches the invitation schema", () => {
    for (const { data } of seedInvitations(now)) {
      expect(() => invitation.assert(data)).not.toThrow();
    }
  });

  it("covers each role and status", () => {
    const profiles = seedUsers(now).map((user) => user.profile);
    expect(new Set(profiles.map((p) => p.role))).toEqual(
      new Set(["admin", "volunteer"]),
    );
    expect(new Set(profiles.map((p) => p.status))).toEqual(
      new Set(["active", "removed"]),
    );
  });

  it("disables exactly the removed accounts in Auth", () => {
    for (const { profile, disabled } of seedUsers(now)) {
      expect(disabled).toBe(profile.status === "removed");
    }
  });

  it("has a pending, an expired and a canceled invite", () => {
    const invites = seedInvitations(now).map((invite) => invite.data);
    const pending = invites.filter((i) => i.status === "pending");
    expect(pending.some((i) => new Date(i.expiresAt) > now)).toBe(true);
    expect(pending.some((i) => new Date(i.expiresAt) <= now)).toBe(true);
    expect(invites.some((i) => i.status === "canceled")).toBe(true);
  });

  it("uses unique uids and emails", () => {
    const users = seedUsers(now);
    expect(new Set(users.map((u) => u.uid)).size).toBe(users.length);
    expect(new Set(users.map((u) => u.profile.email)).size).toBe(users.length);
  });
});

describe("seed", () => {
  it("creates missing accounts and writes every profile and invite", async () => {
    updateUser.mockRejectedValue({ code: "auth/user-not-found" });

    await expect(seed(db, auth, now)).resolves.toEqual({
      users: seedUsers(now).length,
      invitations: seedInvitations(now).length,
    });

    expect(createUser).toHaveBeenCalledTimes(seedUsers(now).length);
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "seed-admin",
        email: "admin@example.com",
        password: SEED_PASSWORD,
        emailVerified: true,
        disabled: false,
      }),
    );
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "seed-removed", disabled: true }),
    );
    expect(set).toHaveBeenCalledTimes(
      seedUsers(now).length + seedInvitations(now).length,
    );
  });

  it("updates existing accounts on a rerun instead of duplicating them", async () => {
    updateUser.mockResolvedValue();

    await seed(db, auth, now);

    expect(updateUser).toHaveBeenCalledTimes(seedUsers(now).length);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("stops on unexpected Auth errors", async () => {
    updateUser.mockRejectedValue({ code: "auth/internal-error" });

    await expect(seed(db, auth, now)).rejects.toMatchObject({
      code: "auth/internal-error",
    });
    expect(createUser).not.toHaveBeenCalled();
  });
});
