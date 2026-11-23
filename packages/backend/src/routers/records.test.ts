import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCaller } from "@backend/routers/index.ts";
import * as records from "@backend/services/records.ts";
import { getUserProfile } from "@backend/services/users.ts";
import type { Context } from "@backend/trpc/context.ts";

vi.mock("@backend/services/records.ts");
vi.mock("@backend/services/users.ts", () => ({
  getUserProfile: vi.fn<typeof getUserProfile>(),
}));

const db = {} as Firestore;
const auth = {} as Auth;
const member = {
  firstName: "Pat",
  lastName: "Planter",
  email: "pat@example.com",
  role: "admin",
  status: "active",
} as const;
const id = "7A21-6495";
const address = {
  address: "62 Phila St",
  city: "Saratoga Springs",
  state: "NY",
};
const input = {
  ...address,
  lat: 43.079,
  lng: -73.784,
  status: "requested",
} as const;

const caller = (session: Context["session"]) =>
  createCaller({ session, db, auth }).records;
const signedIn = caller({
  uid: "member",
  email: member.email,
  emailVerified: true,
});

const calls = [
  ["get", (api: typeof signedIn) => api.get({ id }), records.getTreeRecord],
  [
    "create",
    (api: typeof signedIn) => api.create(input),
    records.createTreeRecord,
  ],
  [
    "update",
    (api: typeof signedIn) =>
      api.update({ id, changes: { species: "Red maple" } }),
    records.updateTreeRecord,
  ],
  [
    "countAtAddress",
    (api: typeof signedIn) => api.countAtAddress(address),
    records.countTreesAtAddress,
  ],
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUserProfile).mockResolvedValue(member);
});

describe.each(calls)("records.%s access", (_name, call, service) => {
  it("rejects a signed-out caller", async () => {
    await expect(call(caller(null))).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(service).not.toHaveBeenCalled();
  });

  it("rejects a removed member or an account with no profile", async () => {
    vi.mocked(getUserProfile).mockResolvedValueOnce({
      ...member,
      status: "removed",
    });
    vi.mocked(getUserProfile).mockResolvedValueOnce(null);
    await expect(call(signedIn)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(call(signedIn)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(service).not.toHaveBeenCalled();
  });
});

it("rejects invalid input before calling persistence", async () => {
  await expect(signedIn.create({ ...input, lat: 91 })).rejects.toMatchObject({
    code: "BAD_REQUEST",
  });
  await expect(
    signedIn.update({ id, changes: { treeNumber: 7 } } as never),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  await expect(
    signedIn.get({ id: "../trees/7A21-6495" }),
  ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  expect(records.createTreeRecord).not.toHaveBeenCalled();
  expect(records.updateTreeRecord).not.toHaveBeenCalled();
  expect(records.getTreeRecord).not.toHaveBeenCalled();
});
