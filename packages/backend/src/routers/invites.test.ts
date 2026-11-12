import assert from "node:assert/strict";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Invitation, UserProfile } from "@repo/common";
import { createHash } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { createCaller } from "@backend/routers/index.ts";
import { deliverInvites } from "@backend/services/inviteDelivery.ts";
import { getUserProfile } from "@backend/services/users.ts";

vi.mock("@backend/services/inviteDelivery.ts");
vi.mock("@backend/services/users.ts");

const admin: UserProfile = {
  email: "admin@sustainablesaratoga.org",
  firstName: "Admin",
  lastName: "Example",
  role: "admin",
  status: "active",
};
const session = { uid: "admin", email: admin.email, emailVerified: true };
const mail = vi.mocked(deliverInvites);
const profile = vi.mocked(getUserProfile);
const week = 7 * 24 * 60 * 60 * 1000;
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function setup() {
  const records = new Map<string, Invitation>();
  const members: { email: string; status?: string }[] = [];
  let nextId = 0;
  const ref = (id: string) => ({
    id,
    get: () => {
      const record = records.get(id);
      return Promise.resolve({
        ref: ref(id),
        exists: record !== undefined,
        data: () => record,
        updateTime: record && {
          record,
          isEqual: (other: { record: Invitation }) => record === other.record,
        },
      });
    },
  });
  const users = {
    get: () =>
      Promise.resolve({ docs: members.map((user) => ({ data: () => user })) }),
  };
  const invites = {
    doc: (id = `invite-${++nextId}`) => ref(id),
    where: (field: "status", operator: "==", status: string) => ({
      get: async () => ({
        docs: await Promise.all(
          [...records]
            .filter(
              ([, record]) => operator === "==" && record[field] === status,
            )
            .map(([id]) => ref(id).get()),
        ),
      }),
    }),
  };
  const db = {
    collection: (name: string) => (name === "users" ? users : invites),
    runTransaction: async (run: (tx: unknown) => Promise<unknown>) => {
      const writes: (() => void)[] = [];
      const result = await run({
        get: (target: { get: () => Promise<unknown> }) => target.get(),
        set: ({ id }: { id: string }, value: Invitation) =>
          writes.push(() => records.set(id, value)),
        delete: ({ id }: { id: string }) =>
          writes.push(() => records.delete(id)),
        update: ({ id }: { id: string }, value: Partial<Invitation>) =>
          writes.push(() => {
            const record = records.get(id);
            assert.ok(record);
            records.set(id, { ...record, ...value });
          }),
      });
      writes.forEach((write) => write());
      return result;
    },
  } as unknown as Firestore;
  const context = { db, auth: {} as Auth };
  return {
    records,
    members,
    invites: createCaller({ ...context, session }).invites,
    anonymous: createCaller({ ...context, session: null }).invites,
  };
}

const email = "volunteer@example.com";
const send = { emails: [email], role: "volunteer" as const };
const inviteId = "invite-1";

beforeEach(() => {
  vi.resetAllMocks();
  profile.mockResolvedValue(admin);
  mail.mockResolvedValue([]);
});

it("sends three links and saves only their hashes with a seven-day expiry", async () => {
  const { invites, records } = setup();
  const emails = [email, "next@example.com", "third@example.com"];
  await expect(
    invites.send({
      ...send,
      emails: emails.map((value) => value.toUpperCase()),
    }),
  ).resolves.toEqual({ ok: true, count: 3 });
  const messages = mail.mock.calls[0]?.[0];
  assert.ok(messages);
  expect(mail).toHaveBeenCalledTimes(1);
  expect(messages.map((message) => message.email)).toEqual(emails);
  expect(new Set(messages.map((message) => message.token)).size).toBe(3);
  expect(records.size).toBe(3);
  for (const [index, record] of [...records.values()].entries()) {
    const message = messages[index];
    assert.ok(message);
    const { token } = message;
    expect(token).toMatch(/^[\w-]{43}$/);
    expect(record).toEqual({
      email: emails[index],
      invitedBy: session.uid,
      role: "volunteer",
      status: "pending",
      tokenHash: digest(token),
      createdAt: record.createdAt,
      expiresAt: new Date(Date.parse(record.createdAt) + week).toISOString(),
    });
  }
});

it.each([
  { role: "volunteer", emails: ["invalid", email], rejected: ["invalid"] },
  {
    role: "volunteer",
    emails: [email, email.toUpperCase()],
    rejected: [email, email.toUpperCase()],
  },
  { role: "admin", emails: [admin.email, email], rejected: [email] },
] as const)(
  "rejects the whole batch when validation fails",
  async ({ role, emails, rejected }) => {
    const { invites, records } = setup();
    const result = await invites.send({ role, emails: [...emails] });
    expect(result).toMatchObject({
      ok: false,
      failures: rejected.map((value) => ({ email: value })),
    });
    expect(mail).not.toHaveBeenCalled();
    expect(records.size).toBe(0);
  },
);

it("rejects a legacy active member case-insensitively", async () => {
  const { invites, records, members } = setup();
  members.push({ email: email.toUpperCase() });
  await expect(invites.send(send)).resolves.toMatchObject({
    ok: false,
    failures: [{ email }],
  });
  expect(mail).not.toHaveBeenCalled();
  expect(records.size).toBe(0);
});

it("rechecks membership after delivery", async () => {
  const { invites, records, members } = setup();
  mail.mockImplementationOnce(() => {
    members.push({ email, status: "active" });
    return Promise.resolve([]);
  });
  await expect(invites.send(send)).resolves.toMatchObject({
    ok: false,
    failures: [{ email }],
  });
  expect(records.size).toBe(0);
});

it("leaves existing and new invites untouched when any delivery fails", async () => {
  const { invites, records } = setup();
  await invites.send(send);
  const existing = records.get(inviteId);
  const failures = [{ email: "new@example.com", reason: "Delivery failed." }];
  mail.mockResolvedValueOnce(failures);
  await expect(
    invites.send({ ...send, emails: [email, "new@example.com"] }),
  ).resolves.toEqual({ ok: false, failures });
  expect([...records.values()]).toEqual([existing]);
});

it("replaces an existing pending invite when sending again", async () => {
  const { invites, records } = setup();
  await invites.send(send);
  const old = records.get(inviteId);
  assert.ok(old);
  records.set(inviteId, { ...old, expiresAt: new Date(0).toISOString() });
  await expect(invites.send(send)).resolves.toEqual({ ok: true, count: 1 });
  expect(records.size).toBe(1);
  expect(records.get(inviteId)?.tokenHash).not.toBe(old.tokenHash);
});

it.each([false, true])(
  "resends pending invites (expired: %s) and rotates the link",
  async (expired) => {
    const { invites, records } = setup();
    await invites.send(send);
    const old = records.get(inviteId);
    assert.ok(old);
    records.set(inviteId, {
      ...old,
      expiresAt: new Date(Date.now() + (expired ? -1000 : 1000)).toISOString(),
    });
    const oldToken = mail.mock.calls[0]?.[0][0]?.token;
    assert.ok(oldToken);
    await expect(invites.resend({ inviteId })).resolves.toEqual({
      ok: true,
      count: 1,
    });
    const newToken = mail.mock.calls[1]?.[0][0]?.token;
    assert.ok(newToken);
    expect(records.get(inviteId)).toMatchObject({
      tokenHash: digest(newToken),
      createdAt: old.createdAt,
      invitedBy: old.invitedBy,
    });
    expect(records.get(inviteId)?.tokenHash).not.toBe(digest(oldToken));
    const replacement = records.get(inviteId);
    assert.ok(replacement);
    expect(Date.parse(replacement.expiresAt)).toBeGreaterThan(
      Date.now() + week - 5000,
    );
  },
);

it("cancels immediately and accepts a repeated cancel", async () => {
  const { invites, records } = setup();
  await invites.send(send);
  await expect(invites.cancel({ inviteId })).resolves.toEqual({ ok: true });
  await expect(invites.cancel({ inviteId })).resolves.toEqual({ ok: true });
  const token = mail.mock.calls[0]?.[0][0]?.token;
  assert.ok(token);
  const record = records.get(inviteId);
  assert.ok(record);
  expect(record.tokenHash).toBe(digest(token));
  expect(record.status).toBe("canceled");
  await expect(invites.resend({ inviteId })).rejects.toMatchObject({
    code: "CONFLICT",
  });
  expect(mail).toHaveBeenCalledTimes(1);
});

it.each(["canceled", "accepted"] as const)(
  "keeps a concurrent %s state during resend",
  async (status) => {
    const { invites, records } = setup();
    await invites.send(send);
    const old = records.get(inviteId);
    assert.ok(old);
    mail.mockImplementationOnce(() => {
      records.set(inviteId, { ...old, status });
      return Promise.resolve([]);
    });
    await expect(invites.resend({ inviteId })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(records.get(inviteId)).toEqual({ ...old, status });
  },
);

it("rejects missing invites and refuses to cancel an accepted invite", async () => {
  const { invites, records } = setup();
  await expect(invites.resend({ inviteId })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(invites.cancel({ inviteId })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await invites.send(send);
  const record = records.get(inviteId);
  assert.ok(record);
  records.set(inviteId, { ...record, status: "accepted" });
  await expect(invites.cancel({ inviteId })).rejects.toMatchObject({
    code: "CONFLICT",
  });
});

it.each(["send", "resend", "cancel"] as const)(
  "restricts %s to active admins",
  async (method) => {
    const { invites, anonymous } = setup();
    const call = (caller: typeof invites) =>
      method === "send" ? caller.send(send) : caller[method]({ inviteId });
    await expect(call(anonymous)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    profile.mockResolvedValue({
      ...admin,
      role: "volunteer",
      volunteerTypes: ["planter"],
    });
    await expect(call(invites)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mail).not.toHaveBeenCalled();
  },
);
