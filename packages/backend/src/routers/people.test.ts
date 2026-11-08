import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Person, Session, UserProfile } from "@repo/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCaller } from "@backend/routers/index.ts";
import { listPeople, removeAccess } from "@backend/services/people.ts";
import { getUserProfile } from "@backend/services/users.ts";

vi.mock("@backend/services/users.ts", () => ({
  createUserProfile: vi.fn<() => void>(),
  getUserProfile: vi.fn<typeof getUserProfile>(),
}));
vi.mock("@backend/services/people.ts", () => ({
  listPeople: vi.fn<typeof listPeople>(),
  removeAccess: vi.fn<typeof removeAccess>(),
}));

const db = {} as Firestore;
const auth = {} as Auth;
const session: Session = {
  uid: "admin-1",
  email: "admin@example.com",
  emailVerified: true,
};
const admin: UserProfile = {
  firstName: "Ad",
  lastName: "Min",
  email: "admin@example.com",
  role: "admin",
  status: "active",
};
const volunteer: UserProfile = {
  firstName: "Vol",
  lastName: "Unteer",
  email: "vol@example.com",
  role: "volunteer",
  status: "active",
  volunteerTypes: ["pruner"],
};

const anonymous = createCaller({ session: null, db, auth });
const asAdmin = createCaller({ session, db, auth });

const calls = [
  ["list", (c: typeof asAdmin) => c.people.list()],
  ["removeAccess", (c: typeof asAdmin) => c.people.removeAccess({ uid: "u2" })],
] as const;

beforeEach(() => {
  vi.resetAllMocks();
});

describe.each(calls)("people.%s permissions", (_name, call) => {
  it("refuses signed-out callers", async () => {
    await expect(call(anonymous)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(listPeople).not.toHaveBeenCalled();
    expect(removeAccess).not.toHaveBeenCalled();
  });

  it("refuses volunteers", async () => {
    vi.mocked(getUserProfile).mockResolvedValue(volunteer);

    await expect(call(asAdmin)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listPeople).not.toHaveBeenCalled();
    expect(removeAccess).not.toHaveBeenCalled();
  });

  it("refuses removed admins", async () => {
    vi.mocked(getUserProfile).mockResolvedValue({
      ...admin,
      status: "removed",
    });

    await expect(call(asAdmin)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listPeople).not.toHaveBeenCalled();
    expect(removeAccess).not.toHaveBeenCalled();
  });
});

describe("people.list", () => {
  it("returns the people for an admin, marking the caller", async () => {
    const rows: Person[] = [
      {
        id: "u1",
        name: "Ad Min",
        email: admin.email,
        role: "admin",
        status: "active",
        invitedAt: null,
        expiresAt: null,
        isSelf: true,
      },
    ];
    vi.mocked(getUserProfile).mockResolvedValue(admin);
    vi.mocked(listPeople).mockResolvedValue(rows);

    await expect(asAdmin.people.list()).resolves.toEqual(rows);
    expect(listPeople).toHaveBeenCalledExactlyOnceWith(db, session.uid);
  });
});

describe("people.removeAccess", () => {
  beforeEach(() => {
    vi.mocked(getUserProfile).mockResolvedValue(admin);
  });

  it("removes the requested member as the calling admin", async () => {
    await expect(asAdmin.people.removeAccess({ uid: "u2" })).resolves.toEqual({
      uid: "u2",
    });
    expect(removeAccess).toHaveBeenCalledExactlyOnceWith(
      db,
      auth,
      session.uid,
      "u2",
    );
  });

  it("rejects an empty uid before calling the service", async () => {
    await expect(
      asAdmin.people.removeAccess({ uid: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(removeAccess).not.toHaveBeenCalled();
  });

  it("surfaces service errors", async () => {
    vi.mocked(removeAccess).mockRejectedValue(new Error("boom"));

    await expect(
      asAdmin.people.removeAccess({ uid: "u2" }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "boom" });
  });
});
