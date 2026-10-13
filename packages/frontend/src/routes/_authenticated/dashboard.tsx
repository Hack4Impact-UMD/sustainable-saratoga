import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

/**
 * Placeholder so the `_authenticated` layout has a page inside it. Replace it
 * with the first real signed-in page.
 */
function Dashboard() {
  return null;
}
