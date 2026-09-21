import type { Session } from "@repo/common";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Reads the `Authorization: Bearer <id token>` header and verifies it with the
 * Admin SDK. An absent or invalid token is not an error here -- it produces an
 * anonymous context, and `protectedProcedure` decides what to reject.
 *
 * The Admin SDK reads `FIREBASE_AUTH_EMULATOR_HOST`, which the emulator sets.
 * The same code therefore runs against the emulator and against production.
 */
export async function createContext({ req }: CreateExpressContextOptions) {
  return {
    session: await resolveSession(req.headers.authorization),
    db: getFirestore(),
  };
}

async function resolveSession(header: string | undefined) {
  if (!header?.startsWith("Bearer ")) return null;

  try {
    const token = await getAuth().verifyIdToken(header.slice("Bearer ".length));
    return {
      uid: token.uid,
      email: token.email ?? null,
      emailVerified: token.email_verified ?? false,
    } satisfies Session;
  } catch {
    return null;
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
