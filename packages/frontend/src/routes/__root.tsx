import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import { SyncStatus } from "@frontend/components/SyncStatus.tsx";
import { auth } from "@frontend/lib/firebase.ts";
import { useAuth } from "@frontend/lib/useAuth.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";
import { StatusBadge } from "@frontend/components/status/StatusBadge.tsx";
import { StatusMarker } from "@frontend/components/status/StatusMarker";

interface RouterContext {
  auth: AuthState;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const { isAuthed } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const signOut = useMutation({
    mutationFn: () => auth.signOut(),
    onSuccess: async () => {
      await queryClient.resetQueries();
      await router.invalidate();
    },
  });

  return (
    <>
      <div className="p-5">
        <StatusBadge status="requested" />
        <StatusBadge status="possible" />
        <StatusBadge status="approved" />
        <StatusBadge status="planted" />
        <br></br>
        <span>Size 20</span><StatusMarker status="requested" size={20} /> 
        <span>Size 24, selected</span><StatusMarker status="possible" size={24}  selected={true} /> 
        <span>Size 32</span><StatusMarker status="approved" size={32} /> 
        <span>Size 44, selected</span><StatusMarker status="planted" size={44} selected={true} /> 
      </div>
      
      <SyncStatus />
      <Outlet />
      {isAuthed && (
        <button
          type="button"
          data-testid="sign-out"
          onClick={() => signOut.mutate()}
          className="type-control fixed right-4 top-4 rounded-pill border border-line-strong bg-surface px-4 py-2 shadow-1 hover:bg-hover disabled:text-disabled"
          disabled={signOut.isPending}
        >
          Sign out
        </button>
      )}
    </>
  );
}
