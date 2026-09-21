import { addNoteInput } from "@repo/common";
import type { Note } from "@repo/common";
import { protectedProcedure, router } from "@backend/trpc/init.ts";

const COLLECTION = "notes";

export const notesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const snapshot = await ctx.db
      .collection(COLLECTION)
      .where("uid", "==", ctx.session.uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    return snapshot.docs.map((doc): Note => ({
      id: doc.id,
      text: String(doc.get("text")),
      createdAt: Number(doc.get("createdAt")),
    }));
  }),

  add: protectedProcedure
    .input(addNoteInput)
    .mutation(async ({ ctx, input }): Promise<Note> => {
      const note = {
        uid: ctx.session.uid,
        text: input.text,
        createdAt: Date.now(),
      };
      const doc = await ctx.db.collection(COLLECTION).add(note);

      return { id: doc.id, text: note.text, createdAt: note.createdAt };
    }),
});
