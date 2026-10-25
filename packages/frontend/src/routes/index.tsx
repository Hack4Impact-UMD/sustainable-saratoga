import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

/** Landing page. Placeholder until the designs are built. */
function Home() {
  return null;
}
