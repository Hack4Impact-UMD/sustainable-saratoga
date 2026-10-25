import {
  createCallerFactory,
  protectedProcedure,
  router,
} from "@backend/trpc/init.ts";
import { mapRouter } from "@backend/routers/map.ts";

export const appRouter = router({
  /** Needs a valid token. Returns whatever the middleware resolved. */
  me: protectedProcedure.query(({ ctx }) => ctx.session),

  map: mapRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
