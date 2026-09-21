import { TRPCError } from "@trpc/server";
import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import type { Context } from "@backend/trpc/context.ts";
import { createCaller } from "@backend/routers/index.ts";

/**
 * Procedures are called directly, so these tests need no emulator and no
 * HTTP. Copy this pattern when you add a procedure.
 */
function caller(session: Context["session"]) {
  // `hello` and `me` never touch Firestore, so a stub is enough here.
  const db = undefined as unknown as Firestore;
  return createCaller({ session, db });
}

const anonymous = caller(null);
const signedIn = caller({
  uid: "user-1",
  email: "demo@example.com",
  emailVerified: true,
});

describe("appRouter", () => {
  it("serves a public procedure without a token", async () => {
    await expect(anonymous.hello({ name: "world" })).resolves.toEqual({
      greeting: "Hello, world!",
    });
  });

  it("validates input with the shared arktype schema", async () => {
    await expect(anonymous.hello({ name: "" })).rejects.toThrow(TRPCError);
  });

  it("rejects a protected procedure without a token", async () => {
    await expect(anonymous.me()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("passes the session to a protected procedure", async () => {
    await expect(signedIn.me()).resolves.toMatchObject({ uid: "user-1" });
  });
});
