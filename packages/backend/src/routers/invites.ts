import { type } from "arktype";
import { userRole } from "@repo/common";
import {
  cancelInvite,
  resendInvite,
  sendInvites,
} from "@backend/services/invites.ts";
import { adminProcedure, router } from "@backend/trpc/init.ts";

const sendInput = type({ emails: "string[] > 0", role: userRole });
const inviteInput = type({ inviteId: /^(?!\.{1,2}$)(?!__.*__$)[^/]+$/ });

export const invitesRouter = router({
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
