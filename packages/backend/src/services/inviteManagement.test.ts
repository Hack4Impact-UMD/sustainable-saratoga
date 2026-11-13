// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import type { Invitation } from "@repo/common";
import { checkInvite } from "@backend/services/inviteAcceptance.ts";
import {
  deliverInvite,
  InviteDeliveryRejected,
} from "@backend/services/inviteDelivery.ts";
import {
  cancelInvite,
  resendInvite,
} from "@backend/services/inviteManagement.ts";

vi.mock("@backend/services/inviteDelivery.ts", { spy: true });

const id = "legacy-token";
const legacy: Invitation = {
  email: "volunteer@example.org",
  role: "volunteer",
  status: "pending",
  createdAt: "2026-11-08T00:00:00.000Z",
  expiresAt: "2026-11-15T00:00:00.000Z",
  invitedBy: "admin",
};
type Record = Invitation & {
  resendOperation?: {
    token: string;
    startedAt: number;
    leaseUntil: number;
    sentAt?: string;
  };
};

function fixture() {
  let record: Record = { ...legacy };
  const ref = { id };
  let failFinalization = false;
  let failReceipt = false;
  function snapshot() {
    const data = record;
    return {
      exists: true,
      ref,
      data: () => data,
      get: (key: string) => {
        return data[key as keyof Record];
      },
    };
  }
  const collection = {
    doc: (key: string) => ({
      ...ref,
      get: () => Promise.resolve(key === id ? snapshot() : { exists: false }),
    }),
    where: (_field: string, _op: string, hash: string) => ({
      limit: () => ({
        get: () =>
          Promise.resolve({
            docs: hash === record.tokenHash ? [snapshot()] : [],
          }),
      }),
    }),
  };
  const db = {
    collection: (name: string) =>
      name === "users"
        ? { where: () => ({ get: () => Promise.resolve({ docs: [] }) }) }
        : collection,
    runTransaction: async (run: (tx: unknown) => Promise<unknown>) => {
      const updates: Partial<Record>[] = [];
      const result = await run({
        get: () => Promise.resolve(snapshot()),
        update: (_ref: unknown, values: Partial<Record>) =>
          updates.push(values),
      });
      for (const update of updates) {
        if (failFinalization && update.tokenHash) {
          failFinalization = false;
          throw new Error("Could not finalize");
        }
        if (
          failReceipt &&
          update.resendOperation?.sentAt &&
          update.resendOperation.leaseUntil > 0
        ) {
          failReceipt = false;
          throw new Error("Could not persist receipt");
        }
        const { resendOperation, ...values } = update;
        record = { ...record, ...values };
        if (resendOperation && "token" in resendOperation)
          record.resendOperation = resendOperation;
        else if ("resendOperation" in update) delete record.resendOperation;
      }
      return result;
    },
  } as unknown as Firestore;
  return {
    db,
    record: () => record,
    failNextFinalization: () => {
      failFinalization = true;
    },
    failNextReceipt: () => {
      failReceipt = true;
    },
  };
}

beforeEach(() => {
  vi.stubEnv("FUNCTIONS_EMULATOR", "false");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T21:00:00.000Z"));
  vi.mocked(deliverInvite)
    .mockReset()
    .mockImplementation(async () => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

it("rotates the legacy token, keeps the creation date, and invalidates the replacement on cancel", async () => {
  const { db, record } = fixture();
  await expect(checkInvite(db, id)).resolves.toHaveProperty("status", "valid");
  const { person } = await resendInvite(db, id);
  const [delivery] = vi.mocked(deliverInvite).mock.calls;
  expect(delivery).toBeDefined();
  if (!delivery) throw new Error("Expected invite delivery.");
  const [address, token] = delivery;
  expect(address).toBe(legacy.email);
  expect(record().createdAt).toBe(legacy.createdAt);
  expect(person).toMatchObject({
    invitedAt: "2026-11-12T21:00:00.000Z",
    expiresAt: "2026-11-19T21:00:00.000Z",
    status: "pending",
  });
  await expect(checkInvite(db, id)).resolves.toHaveProperty(
    "status",
    "expired",
  );
  await expect(checkInvite(db, token)).resolves.toHaveProperty(
    "status",
    "valid",
  );
  await cancelInvite(db, id);
  await expect(checkInvite(db, token)).resolves.toHaveProperty(
    "status",
    "canceled",
  );
});

it("keeps the previous link and releases the resend lease after delivery fails", async () => {
  const { db, record } = fixture();
  vi.mocked(deliverInvite).mockRejectedValueOnce(
    new InviteDeliveryRejected({
      code: "BAD_GATEWAY",
      message: "Email rejected",
    }),
  );
  await expect(resendInvite(db, id)).rejects.toThrow("Email rejected");
  expect(record()).toEqual(legacy);
  await expect(checkInvite(db, id)).resolves.toHaveProperty("status", "valid");
  await expect(resendInvite(db, id)).resolves.toHaveProperty(
    "person.status",
    "pending",
  );
});

it("rejects an overlapping resend before calling the provider twice", async () => {
  const { db } = fixture();
  let finishDelivery = () => {};
  const sending = new Promise<void>((resolve) => {
    finishDelivery = resolve;
  });
  vi.mocked(deliverInvite).mockReturnValueOnce(sending);
  const first = resendInvite(db, id);
  await vi.waitFor(() => expect(deliverInvite).toHaveBeenCalledTimes(1));
  await expect(resendInvite(db, id)).rejects.toThrow("already being resent");
  finishDelivery();
  await expect(first).resolves.toHaveProperty("person.status", "pending");
  expect(deliverInvite).toHaveBeenCalledTimes(1);
});

it("finalizes the previously delivered link on retry without sending another email", async () => {
  const { db, failNextFinalization } = fixture();
  failNextFinalization();
  await expect(resendInvite(db, id)).rejects.toThrow("Could not finalize");
  const [delivery] = vi.mocked(deliverInvite).mock.calls;
  if (!delivery) throw new Error("Expected delivery");
  const [, token] = delivery;
  await expect(checkInvite(db, id)).resolves.toHaveProperty("status", "valid");
  await expect(checkInvite(db, token)).resolves.toHaveProperty(
    "status",
    "expired",
  );
  await resendInvite(db, id);
  expect(deliverInvite).toHaveBeenCalledTimes(1);
  await expect(checkInvite(db, token)).resolves.toHaveProperty(
    "status",
    "valid",
  );
});

it("reuses the delivery payload and idempotency key when receipt persistence fails", async () => {
  const { db, failNextReceipt } = fixture();
  failNextReceipt();
  await expect(resendInvite(db, id)).rejects.toThrow(
    "Could not persist receipt",
  );
  await resendInvite(db, id);
  const [first, second] = vi.mocked(deliverInvite).mock.calls;
  expect(second).toEqual(first);
  expect(deliverInvite).toHaveBeenCalledTimes(2);
});

it("keeps the replacement inactive when an administrator cancels during delivery", async () => {
  const { db } = fixture();
  vi.mocked(deliverInvite).mockImplementationOnce(async () => {
    await cancelInvite(db, id);
  });
  await expect(resendInvite(db, id)).rejects.toThrow("invite changed");
  await expect(checkInvite(db, id)).resolves.toHaveProperty(
    "status",
    "canceled",
  );
  const [delivery] = vi.mocked(deliverInvite).mock.calls;
  if (!delivery) throw new Error("Expected delivery");
  await expect(checkInvite(db, delivery[1])).resolves.toHaveProperty(
    "status",
    "expired",
  );
});
