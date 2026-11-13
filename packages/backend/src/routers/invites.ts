import { TRPCError } from "@trpc/server";
import { acceptInviteInput, checkInviteInput } from "@repo/common";
import {
  router,
  publicProcedure,
  sessionProcedure,
} from "@backend/trpc/init.ts";
import { acceptInvite, checkInvite } from "@backend/services/invites.ts";

export const invitesRouter = router({
  check: publicProcedure.input(checkInviteInput).query(({ ctx, input }) => {
    return checkInvite(ctx.db, input.token);
  }),

  accept: sessionProcedure
    .input(acceptInviteInput)
    .mutation(({ ctx, input }) => {
      if (!ctx.session.email) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Your account does not have an email address.",
        });
      }

      return acceptInvite(
        ctx.db,
        ctx.auth,
        ctx.session.uid,
        ctx.session.email,
        input,
      );
    }),
});
