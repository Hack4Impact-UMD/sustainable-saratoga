import type { Firestore } from "firebase-admin/firestore";
import type { Session, UserProfile } from "@repo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCaller } from "@backend/routers/index.ts";
import { createUserProfile, getUserProfile } from "@backend/services/users.ts";

vi.mock("@backend/services/users.ts", () => ({
  createUserProfile: vi.fn<typeof createUserProfile>(),
  getUserProfile: vi.fn<typeof getUserProfile>(),
}));

// Only the mocked services receive this database; no Firebase app is needed.
const db = {} as Firestore;
const session: Session = {
  uid: "user-1",
  email: "demo@example.com",
  emailVerified: true,
};
const profile: UserProfile = {
  uid: session.uid,
  email: session.email,
  displayName: "Demo User",
  role: "member",
  createdAt: "2026-10-01T00:00:00.000Z",
};

const anonymous = createCaller({ session: null, db });
const signedIn = createCaller({ session, db });

beforeEach(() => {
  vi.resetAllMocks();
});

describe("users authentication", () => {
  it.each([
    ["me", () => anonymous.users.me()],
    ["create", () => anonymous.users.create({})],
    ["get", () => anonymous.users.get({ uid: "user-2" })],
  ] as const)("rejects anonymous calls to users.%s", async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(getUserProfile).not.toHaveBeenCalled();
    expect(createUserProfile).not.toHaveBeenCalled();
  });
});

describe("users.me", () => {
  it("returns the verified session and its profile", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(profile);

    await expect(signedIn.users.me()).resolves.toEqual({ session, profile });
    expect(getUserProfile).toHaveBeenCalledExactlyOnceWith(db, session.uid);
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

describe("users.create", () => {
  it.each([{}, { displayName: "Demo User" }])(
    "creates a profile with input %j using the verified session",
    async (input) => {
      vi.mocked(createUserProfile).mockResolvedValue(profile);

      await expect(signedIn.users.create(input)).resolves.toEqual(profile);
      expect(createUserProfile).toHaveBeenCalledExactlyOnceWith(
        db,
        session,
        input,
      );
    },
  );

  it("rejects an empty display name before calling the service", async () => {
    await expect(
      signedIn.users.create({ displayName: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(createUserProfile).not.toHaveBeenCalled();
  });

  it("surfaces a failed profile creation", async () => {
    vi.mocked(createUserProfile).mockRejectedValue(
      new Error("not implemented"),
    );

    await expect(signedIn.users.create({})).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "not implemented",
    });
  });
});

describe("users.get", () => {
  it("looks up the requested user rather than the caller", async () => {
    const requestedProfile: UserProfile = { ...profile, uid: "user-2" };
    vi.mocked(getUserProfile).mockResolvedValue(requestedProfile);

    await expect(
      signedIn.users.get({ uid: requestedProfile.uid }),
    ).resolves.toEqual(requestedProfile);
    expect(getUserProfile).toHaveBeenCalledExactlyOnceWith(
      db,
      requestedProfile.uid,
    );
  });

  it("returns null when the requested profile does not exist", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(null);

    await expect(
      signedIn.users.get({ uid: "missing-user" }),
    ).resolves.toBeNull();
    expect(getUserProfile).toHaveBeenCalledExactlyOnceWith(db, "missing-user");
  });

  it("rejects an empty uid before calling the service", async () => {
    await expect(signedIn.users.get({ uid: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  it("surfaces a failed profile lookup", async () => {
    vi.mocked(getUserProfile).mockRejectedValue(new Error("not implemented"));

    await expect(signedIn.users.get({ uid: "user-2" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "not implemented",
    });
  });
});
