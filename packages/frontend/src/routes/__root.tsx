import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { SyncStatus } from "@frontend/components/SyncStatus.tsx";
import type { AuthState } from "@frontend/lib/useAuth.ts";

interface RouterContext {
  auth: AuthState;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <>
      <SyncStatus />
      <Outlet />
    </>
  );
}
