import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Section } from "@frontend/components/Section.tsx";
import { useAuth } from "@frontend/lib/useAuth.ts";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_authenticated/notes")({
  component: Notes,
});

/** Protected procedures backed by Firestore, scoped to the signed-in user. */
function Notes() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const notes = useQuery({
    ...trpc.notes.list.queryOptions(),
    enabled: user !== null,
  });

  const addNote = useMutation(
    trpc.notes.add.mutationOptions({
      onSuccess: async () => {
        setText("");
        await queryClient.invalidateQueries({
          queryKey: trpc.notes.list.queryKey(),
        });
      },
    }),
  );

  if (!user) {
    return (
      <Section title="Notes">
        <p data-testid="notes-signed-out">Sign in on the home page first.</p>
      </Section>
    );
  }

  return (
    <Section title="Notes">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addNote.mutate({ text });
        }}
      >
        <input
          value={text}
          data-testid="note-text"
          aria-label="Note"
          placeholder="Write a note"
          onChange={(event) => setText(event.target.value)}
          className="min-w-40 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
        />
        <button
          type="submit"
          data-testid="add-note"
          disabled={text.length === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <ul
        data-testid="notes"
        className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-500 dark:text-slate-400"
      >
        {notes.data?.map((note) => (
          <li key={note.id}>{note.text}</li>
        ))}
      </ul>
    </Section>
  );
}
