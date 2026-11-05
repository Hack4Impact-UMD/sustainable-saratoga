import { createFileRoute, redirect } from "@tanstack/react-router";
import { FilterSheet } from "@frontend/components/filters/FilterSheet.tsx";
import { DEFAULT_FILTERS } from "@frontend/lib/filters.ts";

export const Route = createFileRoute("/")({
  // Temporary: the landing page has no signed-out view yet, so send visitors to
  // sign in instead of showing a blank page.
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthed) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: Home,
});

/** Landing page. Placeholder until the designs are built. */
function Home() {
  // return null;
  // this is a placeholder until the search bar is built
  return (
    <FilterSheet
      open
      onClose={() => {}}
      applied={DEFAULT_FILTERS}
      onApply={(f) => console.log("apply", f)}
    />
  );
}
