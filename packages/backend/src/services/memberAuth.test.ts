// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { reconcileMemberAuth } from "@backend/services/memberAuth.ts";

it("paginates past unmanaged profiles and reports a missing Auth account without skipping others", async () => {
  const profiles = Array.from({ length: 102 }, (_, index) => ({
    id: String(index).padStart(3, "0"),
    get: (key: string) =>
      index >= 100 && key === "authRevision" ? 1 : undefined,
    data: () =>
      index >= 100
        ? { status: "active", authRevision: 1 }
        : { status: "active" },
    exists: true,
  }));
  const cursors: string[] = [];
  function page(cursor = "") {
    return {
      get: async () =>
        await Promise.resolve({
          docs: profiles.filter((p) => p.id > cursor).slice(0, 100),
        }),
      startAfter: (next: string) => {
        cursors.push(next);
        return page(next);
      },
    };
  }
  const db = {
    collection: () => ({
      orderBy: () => ({ limit: () => page() }),
      doc: (uid: string) => ({ uid }),
    }),
    runTransaction: (run: (tx: unknown) => Promise<unknown>) =>
      run({
        get: async (ref: { uid: string }) =>
          await Promise.resolve(profiles.find((p) => p.id === ref.uid)),
      }),
  } as unknown as Firestore;
  const updateUser = vi.fn<(uid: string) => Promise<void>>(
    async (uid: string) => {
      await Promise.resolve();
      if (uid === "100")
        throw Object.assign(new Error("missing"), {
          code: "auth/user-not-found",
        });
    },
  );
  const auth = {
    updateUser,
    getUser: async () => await Promise.resolve({ disabled: false }),
  } as unknown as Auth;
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const summary = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    await expect(reconcileMemberAuth(db, auth)).rejects.toThrow("incomplete");
    expect(cursors).toEqual(["099"]);
    expect(updateUser.mock.calls.map(([uid]) => uid)).toEqual(["100", "101"]);
    expect(log).toHaveBeenCalledWith("Member Auth reconciliation failed", {
      code: "auth/user-not-found",
    });
  } finally {
    log.mockRestore();
    summary.mockRestore();
  }
});
