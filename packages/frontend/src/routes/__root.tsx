import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createRootRouteWithContext,
  Outlet,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { SyncStatus } from "@frontend/components/SyncStatus.tsx";
import { MenuDrawer } from "@frontend/components/layout/MenuDrawer.tsx";
import { auth } from "@frontend/lib/firebase.ts";
import { useAuth } from "@frontend/lib/useAuth.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";

interface RouterContext {
  auth: AuthState;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const { isAuthed } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pathname } = useLocation();
  const showMenu =
    isAuthed && pathname !== "/people" && !pathname.startsWith("/invite/");

  const signOut = useMutation({
    mutationFn: () => auth.signOut(),
    onSuccess: async () => {
      await queryClient.resetQueries();
      await router.invalidate();
    },
  });

  return (
    <>
      {showMenu && (
        <>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="fixed top-4 left-4 z-40 grid size-11 place-items-center rounded-full border border-line-subtle! bg-surface! text-icon-primary shadow-1 hover:bg-surface! aria-expanded:bg-surface!"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
          <MenuDrawer
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onSignOut={() => {
              setMenuOpen(false);
              signOut.mutate();
            }}
            signOutPending={signOut.isPending}
          />
        </>
      )}

      <SyncStatus />
      <Outlet />
    </>
  );
}
