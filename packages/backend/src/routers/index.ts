import { createCallerFactory, router } from "@backend/trpc/init.ts";
import { mapRouter } from "@backend/routers/map.ts";
import { peopleRouter } from "@backend/routers/people.ts";
import { usersRouter } from "@backend/routers/users.ts";
import { invitesRouter } from "@backend/routers/invites.ts";

export const appRouter = router({
  users: usersRouter,
  map: mapRouter,
  people: peopleRouter,
  invites: invitesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
