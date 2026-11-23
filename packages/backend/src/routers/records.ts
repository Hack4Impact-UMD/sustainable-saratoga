import {
  createTreeRecordInput,
  getTreeRecordInput,
  treeAddress,
  updateTreeRecordInput,
} from "@repo/common";
import {
  countTreesAtAddress,
  createTreeRecord,
  getTreeRecord,
  updateTreeRecord,
} from "@backend/services/records.ts";
import { protectedProcedure, router } from "@backend/trpc/init.ts";

export const recordsRouter = router({
  get: protectedProcedure
    .input(getTreeRecordInput)
    .query(({ ctx, input }) => getTreeRecord(ctx.db, input.id)),
  create: protectedProcedure
    .input(createTreeRecordInput)
    .mutation(({ ctx, input }) =>
      createTreeRecord(ctx.db, ctx.session.uid, input),
    ),
  update: protectedProcedure
    .input(updateTreeRecordInput)
    .mutation(({ ctx, input }) =>
      updateTreeRecord(ctx.db, ctx.session.uid, input),
    ),
  countAtAddress: protectedProcedure
    .input(treeAddress)
    .query(({ ctx, input }) => countTreesAtAddress(ctx.db, input)),
});
