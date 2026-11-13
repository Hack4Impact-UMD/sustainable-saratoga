import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Session, UserProfile } from "@repo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCaller } from "@backend/routers/index.ts";
import { getUserProfile } from "@backend/services/users.ts";

vi.mock("@backend/services/users.ts", () => ({
  getUserProfile: vi.fn<typeof getUserProfile>(),
}));

// Only the mocked services receive this database; no Firebase app is needed.
const db = {} as Firestore;
const auth = {} as Auth;
const session: Session = {
  uid: "user-1",
  email: "demo@example.com",
  emailVerified: true,
};
const profile: UserProfile = {
  firstName: "Demo",
  lastName: "User",
  email: "demo@example.com",
  role: "volunteer",
  status: "active",
  volunteerTypes: ["planter"],
};

const anonymous = createCaller({ session: null, db, auth });
const signedIn = createCaller({ session, db, auth });

beforeEach(() => {
  vi.resetAllMocks();
});

describe("users authentication", () => {
  it.each([
    ["me", () => anonymous.users.me()],
    ["get", () => anonymous.users.get({ uid: "user-2" })],
  ] as const)("rejects anonymous calls to users.%s", async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(getUserProfile).not.toHaveBeenCalled();
  });
});

describe("removed users", () => {
  const removed: UserProfile = {
    ...profile,
    status: "removed",
    removedAt: "2026-01-01T00:00:00.000Z",
    removedBy: "admin-1",
  };

  it.each([
    ["me", () => signedIn.users.me()],
    ["get", () => signedIn.users.get({ uid: "user-2" })],
  ] as const)("refuses users.%s", async (_name, call) => {
    vi.mocked(getUserProfile).mockResolvedValue(removed);

    await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("users.me", () => {
  it("returns the verified session and its profile", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(profile);

    await expect(signedIn.users.me()).resolves.toEqual({ session, profile });
    expect(getUserProfile).toHaveBeenCalledWith(db, session.uid);
  });

  it("returns a null profile when one has not been created", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(null);

    await expect(signedIn.users.me()).resolves.toEqual({
      session,
      profile: null,
    });
  });

  it("surfaces a failed profile lookup", async () => {
    vi.mocked(getUserProfile).mockRejectedValue(new Error("not implemented"));

    await expect(signedIn.users.me()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "not implemented",
    });
  });
});

describe("users without a profile", () => {
  it("can read their own empty profile", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(null);

    await expect(signedIn.users.me()).resolves.toEqual({
      session,
      profile: null,
    });
  });

  it("are refused by users.get", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(null);

    await expect(signedIn.users.get({ uid: "user-2" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("users.get", () => {
  it("looks up the requested user rather than the caller", async () => {
    const requestedUid = "user-2";
    const requestedProfile: UserProfile = {
      ...profile,
      email: "other@example.com",
    };
    vi.mocked(getUserProfile).mockImplementation((_db, uid) =>
      Promise.resolve(uid === requestedUid ? requestedProfile : profile),
    );

    await expect(signedIn.users.get({ uid: requestedUid })).resolves.toEqual(
      requestedProfile,
    );
    expect(getUserProfile).toHaveBeenCalledWith(db, requestedUid);
  });

  it("returns null when the requested profile does not exist", async () => {
    vi.mocked(getUserProfile).mockImplementation((_db, uid) =>
      Promise.resolve(uid === session.uid ? profile : null),
    );

    await expect(
      signedIn.users.get({ uid: "missing-user" }),
    ).resolves.toBeNull();
    expect(getUserProfile).toHaveBeenCalledWith(db, "missing-user");
  });

  it("rejects an empty uid before calling the service", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(profile);

    await expect(signedIn.users.get({ uid: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(getUserProfile).not.toHaveBeenCalledWith(db, "");
  });

  it("surfaces a failed profile lookup", async () => {
    vi.mocked(getUserProfile).mockRejectedValue(new Error("not implemented"));

    await expect(signedIn.users.get({ uid: "user-2" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "not implemented",
    });
  });
});
