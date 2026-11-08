import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "@backend/trpc/context.ts";
import { getUserProfile } from "@backend/services/users.ts";

const t = initTRPC.context<Context>().create({
  isDev:
    process.env.FUNCTIONS_EMULATOR === "true" ||
    process.env.NODE_ENV !== "production",
});

export const router = t.router;
export const middleware = t.middleware;

/** Calls procedures directly, without HTTP. Used by the unit tests. */
export const createCallerFactory = t.createCallerFactory;

/** Callable by anyone. `ctx.session` may be null. */
export const publicProcedure = t.procedure;

/**
 * Callable only with a valid Firebase ID token. Downstream resolvers see
 * `ctx.session` narrowed to a non-null `Session`, and `ctx.profile`, which is
 * null until the user creates one (right after sign-up).
 *
 * Removed users are refused here, so every protected endpoint -- not just the
 * admin ones -- locks them out on their next request.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to call this procedure.",
    });
  }

  const profile = (await getUserProfile(ctx.db, ctx.session.uid)) ?? null;
  if (profile?.status === "removed") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This account no longer has access.",
    });
  }

  return next({ ctx: { ...ctx, session: ctx.session, profile } });
});

/** Callable only by an active admin. Everyone else gets `FORBIDDEN`. */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const { profile } = ctx;
  if (profile?.role !== "admin" || profile.status !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only admins can call this procedure.",
    });
  }

  return next({ ctx: { ...ctx, profile } });
});
