import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

/**
 * Wraps every page that needs a signed-in user: put them in this folder.
 * TanStack Router won't build this layout without at least one page inside.
 */
export const Route = createFileRoute("/_authenticated")({
  component: RouteComponent,
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthed) {
      // TODO: send to /login with ?redirect= once that route exists.
      throw redirect({
        to: "/",
      });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
