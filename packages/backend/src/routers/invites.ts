import { TRPCError } from "@trpc/server";
import { type } from "arktype";
import { acceptInviteInput, checkInviteInput, userRole } from "@repo/common";
import {
  acceptInvite,
  cancelInvite,
  checkInvite,
  resendInvite,
  sendInvites,
} from "@backend/services/invites.ts";
import {
  adminProcedure,
  publicProcedure,
  router,
  sessionProcedure,
} from "@backend/trpc/init.ts";

const sendInput = type({ emails: "1 <= string[] <= 50", role: userRole });
const inviteInput = type({ inviteId: /^(?!\.{1,2}$)(?!__.*__$)[^/]+$/ });

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

  send: adminProcedure
    .input(sendInput)
    .mutation(({ ctx, input }) =>
      sendInvites(ctx.db, ctx.session.uid, input.emails, input.role),
    ),
  resend: adminProcedure
    .input(inviteInput)
    .mutation(({ ctx, input }) => resendInvite(ctx.db, input.inviteId)),
  cancel: adminProcedure
    .input(inviteInput)
    .mutation(({ ctx, input }) => cancelInvite(ctx.db, input.inviteId)),
});
