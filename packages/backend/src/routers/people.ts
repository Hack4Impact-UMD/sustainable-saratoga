import { removeAccessInput } from "@repo/common";
import type { Person } from "@repo/common";
import { adminProcedure, router } from "@backend/trpc/init.ts";
import { listPeople, removeAccess } from "@backend/services/people.ts";

export const peopleRouter = router({
  // Pending and expired invites, then active members
  list: adminProcedure.query(({ ctx }): Promise<Person[]> =>
    listPeople(ctx.db, ctx.session.uid),
  ),

  // Disables the account and marks the profile removed; the profile is kept
  removeAccess: adminProcedure
    .input(removeAccessInput)
    .mutation(async ({ ctx, input }): Promise<{ uid: string }> => {
      await removeAccess(ctx.db, ctx.auth, ctx.session.uid, input.uid);
      return { uid: input.uid };
    }),
});
