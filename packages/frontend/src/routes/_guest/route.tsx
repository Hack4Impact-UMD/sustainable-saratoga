import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

/**
 * Layout route for signed out pages
 * All routes under "/_guest" inherit this layout.
 * If the user is already signed in, send them to "/" instead.
 */
export const Route = createFileRoute("/_guest")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthed) {
      throw redirect({ to: "/" });
    }
  },
  component: GuestLayout,
});

function GuestLayout() {
  return <Outlet />;
}
