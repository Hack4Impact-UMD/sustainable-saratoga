import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { auth } from "@frontend/lib/firebase.ts";
import { useAuthUser } from "@frontend/lib/useAuthUser.ts";

export const Route = createRootRoute({ component: RootLayout });

function RootLayout() {
  const user = useAuthUser();
  const queryClient = useQueryClient();

  const signOut = useMutation({
    mutationFn: () => auth.signOut(),
    onSuccess: () => queryClient.resetQueries(),
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-center gap-4">
        <h1 className="mr-auto text-lg font-semibold">
          Vite + tRPC + Firebase
        </h1>
        <nav className="flex gap-4 text-sm">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/notes">Notes</NavLink>
        </nav>
        {user ? (
          <button
            type="button"
            data-testid="sign-out"
            onClick={() => signOut.mutate()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        ) : null}
      </header>

      <Outlet />
    </div>
  );
}

function NavLink({ to, children }: { to: LinkProps["to"]; children: string }) {
  return (
    <Link
      to={to}
      className="text-slate-500 transition-colors hover:text-slate-900 data-[status=active]:font-medium data-[status=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 dark:data-[status=active]:text-slate-100"
    >
      {children}
    </Link>
  );
}
