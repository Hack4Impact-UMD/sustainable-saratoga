import {
  createCallerFactory,
  protectedProcedure,
  router,
} from "@backend/trpc/init.ts";

export const appRouter = router({
  /** Needs a valid token. Returns whatever the middleware resolved. */
  me: protectedProcedure.query(({ ctx }) => ctx.session),
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
