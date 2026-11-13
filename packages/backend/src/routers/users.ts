import { getUserInput } from "@repo/common";
import type { CurrentUser, UserProfile } from "@repo/common";
import {
  protectedProcedure,
  router,
  signedInProcedure,
} from "@backend/trpc/init.ts";
import { getUserProfile } from "@backend/services/users.ts";

export const usersRouter = router({
  // Current-user/session endpoint: the verified session plus the Firestore profile
  me: signedInProcedure.query(({ ctx }): CurrentUser => ({
    session: ctx.session,
    profile: ctx.profile,
  })),

  // Looks up a user's profile
  get: protectedProcedure
    .input(getUserInput)
    .query(({ ctx, input }): Promise<UserProfile | null> =>
      getUserProfile(ctx.db, input.uid),
    ),
});
