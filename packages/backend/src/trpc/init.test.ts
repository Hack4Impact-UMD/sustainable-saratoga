import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Session, UserProfile } from "@repo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminProcedure,
  createCallerFactory,
  protectedProcedure,
  router,
} from "@backend/trpc/init.ts";
import { getUserProfile } from "@backend/services/users.ts";

vi.mock("@backend/services/users.ts", () => ({
  getUserProfile: vi.fn<typeof getUserProfile>(),
}));

const db = {} as Firestore;
const auth = {} as Auth;
const session: Session = {
  uid: "user-1",
  email: "user@example.com",
  emailVerified: true,
};
const volunteer: UserProfile = {
  firstName: "Vol",
  lastName: "Unteer",
  email: "user@example.com",
  role: "volunteer",
  status: "active",
  volunteerTypes: ["planter"],
};
const admin: UserProfile = {
  firstName: "Ad",
  lastName: "Min",
  email: "user@example.com",
  role: "admin",
  status: "active",
};

const caller = createCallerFactory(
  router({
    protectedPing: protectedProcedure.query(() => "ok"),
    adminPing: adminProcedure.query(() => "ok"),
  }),
);
const signedIn = caller({ session, db, auth });
const anonymous = caller({ session: null, db, auth });

beforeEach(() => {
  vi.resetAllMocks();
});

describe("protectedProcedure", () => {
  it("refuses signed-out callers without reading a profile", async () => {
    await expect(anonymous.protectedPing()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  it("allows a signed-in user who has no profile yet", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(null);

    await expect(signedIn.protectedPing()).resolves.toBe("ok");
    expect(getUserProfile).toHaveBeenCalledExactlyOnceWith(db, session.uid);
  });

  it("allows an active volunteer", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(volunteer);

    await expect(signedIn.protectedPing()).resolves.toBe("ok");
  });

  it("refuses a removed user", async () => {
    vi.mocked(getUserProfile).mockResolvedValue({
      ...volunteer,
      status: "removed",
    });

    await expect(signedIn.protectedPing()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("adminProcedure", () => {
  it("refuses signed-out callers", async () => {
    await expect(anonymous.adminPing()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("refuses a signed-in user with no profile", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(null);

    await expect(signedIn.adminPing()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("refuses a volunteer", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(volunteer);

    await expect(signedIn.adminPing()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("refuses a removed admin", async () => {
    vi.mocked(getUserProfile).mockResolvedValue({
      ...admin,
      status: "removed",
    });

    await expect(signedIn.adminPing()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows an active admin", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(admin);

    await expect(signedIn.adminPing()).resolves.toBe("ok");
  });
});
