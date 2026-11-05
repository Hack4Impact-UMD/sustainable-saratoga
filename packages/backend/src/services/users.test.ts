import type { Firestore } from "firebase-admin/firestore";
import type { CreateUserInput, Session, UserProfile } from "@repo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserProfile, getUserProfile } from "@backend/services/users.ts";

const get = vi.fn<() => Promise<{ exists: boolean; data: () => unknown }>>();
const create = vi.fn<(profile: UserProfile) => Promise<void>>();
const doc = vi.fn<(uid: string) => { get: typeof get; create: typeof create }>(
  () => ({ get, create }),
);
const collection = vi.fn<(name: string) => { doc: typeof doc }>(() => ({
  doc,
}));
const db = { collection } as unknown as Firestore;

const session: Session = {
  uid: "user-1",
  email: "demo@example.com",
  emailVerified: true,
};
const input: CreateUserInput = {
  firstName: "Demo",
  lastName: "User",
  volunteerTypes: ["planter", "pruner"],
};
const profile: UserProfile = {
  ...input,
  email: "demo@example.com",
  role: "volunteer",
};

beforeEach(() => {
  get.mockReset();
  create.mockReset();
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

describe("createUserProfile", () => {
  it("writes a volunteer using the verified session's uid and email", async () => {
    create.mockResolvedValue();

    await expect(createUserProfile(db, session, input)).resolves.toEqual(
      profile,
    );
    expect(doc).toHaveBeenCalledExactlyOnceWith("user-1");
    expect(create).toHaveBeenCalledExactlyOnceWith(profile);
  });

  it("rejects an account with no email without writing", async () => {
    await expect(
      createUserProfile(db, { ...session, email: null }, input),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(create).not.toHaveBeenCalled();
  });

  it("reports an existing profile as a conflict", async () => {
    create.mockRejectedValue(Object.assign(new Error("exists"), { code: 6 }));

    await expect(createUserProfile(db, session, input)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("passes other write failures through", async () => {
    const failure = new Error("unavailable");
    create.mockRejectedValue(failure);

    await expect(createUserProfile(db, session, input)).rejects.toBe(failure);
  });
});
