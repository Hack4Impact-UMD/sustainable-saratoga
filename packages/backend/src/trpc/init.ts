import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "@backend/trpc/context.ts";

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
 * `ctx.session` narrowed to a non-null `Session`.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to call this procedure.",
    });
  }

  return next({ ctx: { ...ctx, session: ctx.session } });
});
