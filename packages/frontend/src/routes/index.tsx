import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  // Map deep link: /?record=<id> (used by "View on map" on record details).
  validateSearch: (search: Record<string, unknown>): { record?: string } =>
    typeof search.record === "string" ? { record: search.record } : {},
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
  return null;
}
