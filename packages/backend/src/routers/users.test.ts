import type { Firestore } from "firebase-admin/firestore";
import type { CreateUserInput, Session, UserProfile } from "@repo/common";
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
  firstName: "Demo",
  lastName: "User",
  email: "demo@example.com",
  role: "volunteer",
  volunteerTypes: ["planter"],
};
const createInput: CreateUserInput = {
  firstName: profile.firstName,
  lastName: profile.lastName,
  volunteerTypes: ["planter"],
};

const anonymous = createCaller({ session: null, db });
const signedIn = createCaller({ session, db });

beforeEach(() => {
  vi.resetAllMocks();
});

describe("users authentication", () => {
  it.each([
    ["me", () => anonymous.users.me()],
    ["create", () => anonymous.users.create(createInput)],
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
  it.each([[["planter"]], [["pruner"]], [["planter", "pruner"]]] as const)(
    "forwards the selected %j volunteer types and verified session",
    async (types) => {
      const volunteerTypes = [...types];
      const input: CreateUserInput = { ...createInput, volunteerTypes };
      const createdProfile: UserProfile = {
        ...profile,
        role: "volunteer",
        volunteerTypes,
      };
      vi.mocked(createUserProfile).mockResolvedValue(createdProfile);

      await expect(signedIn.users.create(input)).resolves.toEqual(
        createdProfile,
      );
      expect(createUserProfile).toHaveBeenCalledExactlyOnceWith(
        db,
        session,
        input,
      );
    },
  );

  it("trims names before passing them to the service", async () => {
    vi.mocked(createUserProfile).mockResolvedValue(profile);

    await signedIn.users.create({
      ...createInput,
      firstName: " Demo ",
      lastName: " User ",
    });

    expect(createUserProfile).toHaveBeenCalledExactlyOnceWith(
      db,
      session,
      createInput,
    );
  });

  it.each([
    ["missing profile fields", {}],
    ["empty first name", { ...createInput, firstName: "" }],
    ["blank last name", { ...createInput, lastName: "   " }],
    ["no volunteer types", { ...createInput, volunteerTypes: [] }],
    ["admin volunteer type", { ...createInput, volunteerTypes: ["admin"] }],
  ])("rejects %s before calling the service", async (_name, input) => {
    await expect(signedIn.users.create(input as never)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(createUserProfile).not.toHaveBeenCalled();
  });

  it("drops a role sent by the client before calling the service", async () => {
    vi.mocked(createUserProfile).mockResolvedValue(profile);

    await signedIn.users.create({ ...createInput, role: "admin" } as never);

    expect(createUserProfile).toHaveBeenCalledExactlyOnceWith(
      db,
      session,
      createInput,
    );
  });

  it("surfaces a failed profile creation", async () => {
    vi.mocked(createUserProfile).mockRejectedValue(
      new Error("not implemented"),
    );

    await expect(signedIn.users.create(createInput)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "not implemented",
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
    vi.mocked(getUserProfile).mockResolvedValue(requestedProfile);

    await expect(signedIn.users.get({ uid: requestedUid })).resolves.toEqual(
      requestedProfile,
    );
    expect(getUserProfile).toHaveBeenCalledExactlyOnceWith(db, requestedUid);
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
