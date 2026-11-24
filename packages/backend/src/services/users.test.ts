import type { Firestore } from "firebase-admin/firestore";
import type { UserProfile } from "@repo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserProfile } from "@backend/services/users.ts";

const get = vi.fn<() => Promise<{ exists: boolean; data: () => unknown }>>();
const doc = vi.fn<(uid: string) => { get: typeof get }>(() => ({ get }));
const collection = vi.fn<(name: string) => { doc: typeof doc }>(() => ({
  doc,
}));
const db = { collection } as unknown as Firestore;

const profile: UserProfile = {
  firstName: "Demo",
  lastName: "User",
  email: "demo@example.com",
  role: "volunteer",
  status: "active",
  volunteerTypes: ["planter", "pruner"],
};

beforeEach(() => {
  get.mockReset();
  doc.mockClear();
  collection.mockClear();
});

describe("getUserProfile", () => {
  it("reads the profile at users/{uid}", async () => {
    get.mockResolvedValue({ exists: true, data: () => profile });

    await expect(getUserProfile(db, "user-1")).resolves.toEqual(profile);
    expect(collection).toHaveBeenCalledExactlyOnceWith("users");
    expect(doc).toHaveBeenCalledExactlyOnceWith("user-1");
  });

  it("returns null when no profile exists", async () => {
    get.mockResolvedValue({ exists: false, data: () => ({}) });

    await expect(getUserProfile(db, "user-1")).resolves.toBeNull();
  });

  it("rejects a stored document that isn't a valid profile", async () => {
    get.mockResolvedValue({
      exists: true,
      data: () => ({ ...profile, role: "owner" }),
    });

    await expect(getUserProfile(db, "user-1")).rejects.toThrow("role");
  });
});
