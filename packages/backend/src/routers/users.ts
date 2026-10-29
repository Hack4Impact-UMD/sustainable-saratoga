import { createUserInput, getUserInput } from "@repo/common";
import type { CurrentUser, UserProfile } from "@repo/common";
import { protectedProcedure, router } from "@backend/trpc/init.ts";
import { createUserProfile, getUserProfile } from "@backend/services/users.ts";

export const usersRouter = router({
  // Current-user/session endpoint: the verified session plus the Firestore profile
  me: protectedProcedure.query(async ({ ctx }): Promise<CurrentUser> => {
    const profile = await getUserProfile(ctx.db, ctx.session.uid);
    return { session: ctx.session, profile };
  }),

  // Creates the profile right after Firebase sign-up
  create: protectedProcedure
    .input(createUserInput)
    .mutation(({ ctx, input }): Promise<UserProfile> =>
      createUserProfile(ctx.db, ctx.session, input),
    ),

  // Looks up a user's profile
  get: protectedProcedure
    .input(getUserInput)
    .query(({ ctx, input }): Promise<UserProfile | null> =>
      getUserProfile(ctx.db, input.uid),
    ),
});
