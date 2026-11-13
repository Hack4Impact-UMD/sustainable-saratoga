import { type } from "arktype";
import { TRPCError } from "@trpc/server";
import { acceptInviteInput, checkInviteInput } from "@repo/common";
import {
  cancelInvite,
  resendInvite,
} from "@backend/services/inviteManagement.ts";
import {
  acceptInvite,
  checkInvite,
  restoreInviteSignIn,
} from "@backend/services/inviteAcceptance.ts";
import {
  adminProcedure,
  publicProcedure,
  router,
  sessionProcedure,
} from "@backend/trpc/init.ts";

const inviteInput = type({ inviteId: /^(?!\.{1,2}$)(?!__.*__$)[^/]+$/ });

export const invitesRouter = router({
  resend: adminProcedure
    .input(inviteInput)
    .mutation(({ ctx, input }) => resendInvite(ctx.db, input.inviteId)),
  cancel: adminProcedure
    .input(inviteInput)
    .mutation(({ ctx, input }) => cancelInvite(ctx.db, input.inviteId)),
  check: publicProcedure
    .input(checkInviteInput)
    .query(({ ctx, input }) => checkInvite(ctx.db, input.token)),
  restoreSignIn: publicProcedure
    .input(checkInviteInput)
    .mutation(({ ctx, input }) =>
      restoreInviteSignIn(ctx.db, ctx.auth, input.token),
    ),
  accept: sessionProcedure
    .input(acceptInviteInput)
    .mutation(({ ctx, input }) => {
      if (!ctx.session.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account does not have an email address.",
        });
      }
      return acceptInvite(ctx.db, ctx.session.uid, ctx.session.email, input);
    }),
});
