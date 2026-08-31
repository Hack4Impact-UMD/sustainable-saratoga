import { helloInput } from "@repo/common";
import {
  createCallerFactory,
  protectedProcedure,
  publicProcedure,
  router,
} from "@backend/trpc/init.ts";
import { notesRouter } from "@backend/routers/notes.ts";

export const appRouter = router({
  /** No token needed. Shows an arktype input shared through `@repo/common`. */
  hello: publicProcedure.input(helloInput).query(({ input }) => ({
    greeting: `Hello, ${input.name}!`,
  })),

  /** Needs a valid token. Returns whatever the middleware resolved. */
  me: protectedProcedure.query(({ ctx }) => ctx.session),

  notes: notesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
