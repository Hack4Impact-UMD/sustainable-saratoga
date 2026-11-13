// @vitest-environment node
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { expect, it, vi } from "vitest";
import {
  acceptInvite,
  finishInviteRestoration,
} from "@backend/services/inviteAcceptance.ts";

const uid = "former-member";
const token = "returning-invite";
const now = new Date("2026-11-13T20:00:00.000Z");
const email = "former@example.org";
const input = { token, firstName: "Returning", lastName: "Member" };

function fixture() {
  const invite: Record<string, unknown> = {
    email,
    role: "volunteer",
    status: "pending",
    invitedBy: "admin",
    createdAt: "2026-11-13T00:00:00.000Z",
    expiresAt: "2026-11-20T00:00:00.000Z",
  };
  const member: Record<string, unknown> = {
    email,
    role: "volunteer",
    status: "removed",
    firstName: "Former",
    lastName: "Member",
    volunteerTypes: ["planter"],
    removedAt: "2026-11-10T00:00:00.000Z",
  };
  function makeRef(id: string, record: Record<string, unknown>) {
    const ref = {
      id,
      get: () =>
        Promise.resolve({
          ref,
          exists: true,
          data: () => ({ ...record }),
          get: (key: string) => record[key],
        }),
      record,
    };
    return ref;
  }
  const inviteRef = makeRef(token, invite);
  const userRef = makeRef(uid, member);
  const db = {
    collection: (name: string) => ({
      doc: () => (name === "invitations" ? inviteRef : userRef),
      where: () => ({
        limit: () => ({ get: () => Promise.resolve({ docs: [] }) }),
      }),
    }),
    runTransaction: (run: (tx: unknown) => Promise<unknown>) =>
      run({
        get: (ref: typeof inviteRef) => ref.get(),
        update: (ref: typeof inviteRef, values: Record<string, unknown>) =>
          Object.assign(ref.record, values),
        set: (ref: typeof inviteRef, values: Record<string, unknown>) => {
          for (const key of Object.keys(ref.record)) delete ref.record[key];
          Object.assign(ref.record, values);
        },
      }),
  } as unknown as Firestore;
  const updateUser = vi
    .fn<() => Promise<void>>()
    .mockImplementation(async () => {});
  return {
    db,
    invite,
    member,
    auth: { updateUser } as unknown as Auth,
    updateUser,
  };
}

it("keeps access removed after Auth fails, and a backend retry finishes the same invite", async () => {
  const { db, invite, member, auth, updateUser } = fixture();
  await expect(acceptInvite(db, uid, email, input, now)).resolves.toEqual({
    status: "restoring",
  });
  expect(invite).toMatchObject({ status: "accepted", acceptedBy: uid });
  updateUser.mockRejectedValueOnce(new Error("Temporary Auth error"));
  await expect(finishInviteRestoration(db, auth, token)).rejects.toThrow(
    "Temporary Auth error",
  );
  expect(member).toMatchObject({
    status: "removed",
    restorationInviteId: token,
  });
  await finishInviteRestoration(db, auth, token);
  expect(member).toMatchObject({ status: "active", firstName: "Returning" });
  expect(member.restorationInviteId).toBeUndefined();
  await expect(acceptInvite(db, uid, email, input, now)).resolves.toEqual({
    status: "accepted",
  });
  await expect(
    acceptInvite(db, "different-uid", email, input, now),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});

it("keeps a newer removal when it races account re-enablement", async () => {
  const { db, member, auth, updateUser } = fixture();
  await acceptInvite(db, uid, email, input, now);
  updateUser.mockImplementationOnce(() => {
    delete member.restorationInviteId;
    member.removedAt = now.toISOString();
    return Promise.resolve();
  });
  await finishInviteRestoration(db, auth, token);
  expect(updateUser.mock.calls).toEqual([
    [uid, { disabled: false }],
    [uid, { disabled: true }],
  ]);
  expect(member.status).toBe("removed");
  await expect(acceptInvite(db, uid, email, input, now)).rejects.toMatchObject({
    code: "CONFLICT",
  });
});
