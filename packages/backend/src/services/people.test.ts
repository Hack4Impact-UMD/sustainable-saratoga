import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPeople, removeAccess } from "@backend/services/people.ts";

type Docs = { id: string; data: () => unknown }[];

const now = new Date("2026-06-01T00:00:00.000Z");
let invites: Docs = [];
let users: Docs = [];
let profile: Record<string, unknown> | null = null;

function storedProfile() {
  return {
    exists: profile !== null,
    data: () => (profile ? { ...profile } : {}),
  };
}

function applyWrite(data: unknown) {
  const patch = data as Record<string, unknown>;
  const next: Record<string, unknown> = profile ? { ...profile } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== null && typeof value === "object") delete next[key];
    else next[key] = value;
  }
  profile = next;
}

const update = vi.fn<(data: unknown) => Promise<void>>();
const get = vi.fn<() => Promise<{ exists: boolean; data: () => unknown }>>();
const doc = vi.fn<(uid: string) => { get: typeof get; update: typeof update }>(
  () => ({ get, update }),
);
const where = vi.fn<
  (...args: unknown[]) => { get: () => Promise<{ docs: Docs }> }
>(() => ({ get: () => Promise.resolve({ docs: invites }) }));
const db = {
  runTransaction: (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: () => get(),
      update: (_ref: unknown, data: unknown) => update(data),
    }),
  collection: (name: string) =>
    name === "invitations"
      ? { where }
      : { get: () => Promise.resolve({ docs: users }), doc },
} as unknown as Firestore;

const updateUser = vi.fn<(uid: string, data: unknown) => Promise<void>>();
const revokeRefreshTokens = vi.fn<(uid: string) => Promise<void>>();
const auth = { updateUser, revokeRefreshTokens } as unknown as Auth;

const member = (firstName: string, role = "volunteer", status?: string) => ({
  firstName,
  lastName: "Smith",
  email: `${firstName.toLowerCase()}@example.com`,
  role,
  ...(role === "volunteer" ? { volunteerTypes: ["planter"] } : {}),
  ...(status ? { status } : {}),
});
const invite = (id: string, invitedAt: string, expiresAt: string) => ({
  id,
  data: () => ({
    email: `${id}@example.com`,
    role: "volunteer",
    status: "pending",
    createdAt: invitedAt,
    expiresAt,
    invitedBy: "admin-1",
  }),
});

beforeEach(() => {
  vi.clearAllMocks();
  invites = [];
  users = [];
  profile = null;
  get.mockImplementation(() => Promise.resolve(storedProfile()));
  update.mockImplementation((data) => {
    applyWrite(data);
    return Promise.resolve();
  });
});

describe("listPeople", () => {
  it("lists invites first, then active members, hiding removed ones", async () => {
    invites = [
      invite("old", "2026-05-01T00:00:00.000Z", "2026-05-08T00:00:00.000Z"),
      invite("new", "2026-05-30T00:00:00.000Z", "2026-06-06T00:00:00.000Z"),
    ];
    users = [
      { id: "u-zed", data: () => member("Zed") },
      { id: "u-self", data: () => member("Amy", "admin") },
      { id: "u-gone", data: () => member("Gone", "volunteer", "removed") },
    ];

    const rows = await listPeople(db, "u-self", now);

    expect(rows.map((row) => [row.id, row.status, row.isSelf])).toEqual([
      ["new", "pending", false],
      ["old", "expired", false],
      ["u-self", "active", true],
      ["u-zed", "active", false],
    ]);
    expect(where).toHaveBeenCalledWith("status", "==", "pending");
  });

  it("includes name, email, role and dates", async () => {
    invites = [
      invite("i1", "2026-05-30T00:00:00.000Z", "2026-06-06T00:00:00.000Z"),
    ];
    users = [{ id: "u1", data: () => member("Zed") }];

    expect(await listPeople(db, "other", now)).toEqual([
      {
        id: "i1",
        name: "",
        email: "i1@example.com",
        role: "volunteer",
        status: "pending",
        invitedAt: "2026-05-30T00:00:00.000Z",
        expiresAt: "2026-06-06T00:00:00.000Z",
        isSelf: false,
      },
      {
        id: "u1",
        name: "Zed Smith",
        email: "zed@example.com",
        role: "volunteer",
        status: "active",
        invitedAt: null,
        expiresAt: null,
        isSelf: false,
      },
    ]);
  });
});

describe("removeAccess", () => {
  it("marks the profile removed, disables the account and revokes sessions", async () => {
    profile = member("Zed");

    await removeAccess(db, auth, "admin-1", "u1", now);

    expect(doc).toHaveBeenCalledWith("u1");
    expect(update).toHaveBeenCalledWith({
      status: "removed",
      removedAt: now.toISOString(),
      removedBy: "admin-1",
      restorationInviteId: expect.anything(),
      authUnlock: expect.anything(),
      desiredAuthDisabled: true,
      authRevision: 1,
    });
    expect(updateUser).toHaveBeenCalledExactlyOnceWith("u1", {
      disabled: true,
    });
    expect(revokeRefreshTokens).toHaveBeenCalledExactlyOnceWith("u1");
  });

  it("never deletes the profile", async () => {
    profile = member("Zed");
    const deleteSpy = vi.fn<() => void>();
    doc.mockReturnValueOnce({ get, update, delete: deleteSpy } as never);

    await removeAccess(db, auth, "admin-1", "u1", now);

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("refuses to remove the calling admin", async () => {
    await expect(
      removeAccess(db, auth, "admin-1", "admin-1", now),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(update).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("reports a missing member", async () => {
    profile = null;

    await expect(
      removeAccess(db, auth, "admin-1", "nobody", now),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("refreshes revocation for an already-removed member", async () => {
    profile = member("Zed", "volunteer", "removed");

    await removeAccess(db, auth, "admin-1", "u1", now);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "removed",
        removedBy: "admin-1",
        restorationInviteId: expect.anything(),
      }),
    );
    expect(updateUser).toHaveBeenCalledExactlyOnceWith("u1", {
      disabled: true,
    });
    expect(revokeRefreshTokens).toHaveBeenCalledExactlyOnceWith("u1");
  });

  it("re-enables auth when a newer restoration lands during the disable", async () => {
    profile = member("Zed", "volunteer", "active");
    updateUser.mockImplementationOnce(() => {
      profile = member("Zed", "volunteer", "active");
      return Promise.resolve();
    });

    await removeAccess(db, auth, "admin-1", "u1", now);

    expect(updateUser.mock.calls).toEqual([
      ["u1", { disabled: true }],
      ["u1", { disabled: false }],
    ]);
    expect(profile?.status).toBe("active");
  });
});
