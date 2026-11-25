import { treeRecord } from "@repo/common";
import { protectedProcedure, router } from "@backend/trpc/init.ts";
import { type } from "arktype";

const createTreeRecordInput = treeRecord
  .omit("id")
  .omit("recordInformation")
  .omit("address")
  .omit("city")
  .omit("state")
  .omit("zip")
  .omit("lat")
  .omit("lng")
  .and({
    address: "string = ''",
    city: "string = ''",
    state: "string = ''",
    zip: "string | null",
    lat: "number = 0",
    lng: "number = 0",
  });

const updateTreeRecordInput = treeRecord.omit("id").omit("recordInformation");

export const recordsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const snapshot = await ctx.db.collection("records").get();

    return snapshot.docs.map((doc) =>
      treeRecord.assert({
        ...doc.data(),
        id: doc.id,
      }),
    );
  }),
  getById: protectedProcedure
    .input(type({ id: "string >= 1" }))
    .query(async ({ ctx, input }) => {
      const recordRef = ctx.db.collection("records").doc(input.id);
      const snapshot = await recordRef.get();

      if (!snapshot.exists) {
        return null;
      }

      return treeRecord.assert({
        ...snapshot.data(),
        id: snapshot.id,
      });
    }),

  create: protectedProcedure
    .input(createTreeRecordInput)
    .mutation(async ({ ctx, input }) => {
      const recordRef = ctx.db.collection("records").doc();

      const now = new Date().toISOString();
      const userName =
        `${ctx.profile.firstName} ${ctx.profile.lastName}`.trim();

      const record = treeRecord.assert({
        ...input,
        id: recordRef.id,
        recordInformation: {
          createdAt: now,
          createdBy: userName,
          lastEditedAt: now,
          lastEditedBy: userName,
        },
      });

      await recordRef.set(record);

      return record;
    }),

  update: protectedProcedure
    .input(type({ id: "string >= 1" }).and(updateTreeRecordInput))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const recordRef = ctx.db.collection("records").doc(id);
      const snapshot = await recordRef.get();

      if (!snapshot.exists) {
        throw new Error("Record not found.");
      }

      const existingRecord = treeRecord.assert({
        ...snapshot.data(),
        id: snapshot.id,
      });

      const now = new Date().toISOString();
      const userName =
        `${ctx.profile.firstName} ${ctx.profile.lastName}`.trim();

      const updatedRecord = treeRecord.assert({
        ...existingRecord,
        ...updates,
        id,
        recordInformation: {
          ...existingRecord.recordInformation,
          lastEditedAt: now,
          lastEditedBy: userName,
        },
      });

      await recordRef.set(updatedRecord);

      return updatedRecord;
    }),
});
