import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

/**
 * Wraps every page that needs a signed-in user: put them in this folder.
 * TanStack Router won't build this layout without at least one page inside.
 */
export const Route = createFileRoute("/_authenticated")({
  component: RouteComponent,
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthed) {
      throw redirect({
        to: "/login",
        search: {
          // Pass the full path they tried to visit so we can return them
          // there after a successful sign-in.
          redirect: location.href,
        },
      });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
