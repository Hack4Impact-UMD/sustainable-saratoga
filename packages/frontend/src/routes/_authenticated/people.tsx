import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { PeoplePage } from "@frontend/components/people/PeoplePage.tsx";
import { trpc } from "@frontend/lib/trpc.ts";
import { useAuth } from "@frontend/lib/useAuth.ts";
import { useEffect } from "react";

/**
 * Admin-only entry point for the People & invitations screen.
 *
 * The parent route verifies that the user is signed in. This route then checks
 * the user's profile role before exposing the page to prevent volunteers from
 * reaching it directly by URL.
 */
export const Route = createFileRoute("/_authenticated/people")({
  component: PeopleRoute,
});

/** Loads the current profile and redirects non-admin users away from the page. */
function PeopleRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profileQuery = useQuery(trpc.users.me.queryOptions());
  const isAdmin =
    profileQuery.data?.session.uid === user?.uid &&
    profileQuery.data?.profile?.role === "admin";

  // Wait for the profile before deciding whether the user may enter.
  useEffect(() => {
    if (profileQuery.isSuccess && !isAdmin) {
      void navigate({ to: "/" });
    }
  }, [isAdmin, navigate, profileQuery.isSuccess]);

  if (profileQuery.isPending) {
    return <output>Loading account...</output>;
  }

  if (profileQuery.isError) {
    return (
      <main className="mx-auto w-full max-w-md p-4">
        <p role="alert" className="flex items-center gap-2 text-error">
          <AlertCircle aria-hidden="true" className="size-5" />
          Couldn&apos;t load your account.
        </p>
        <button
          type="button"
          className="type-link min-h-11 min-w-11"
          onClick={() => void profileQuery.refetch()}
        >
          Retry
        </button>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return <PeoplePage />;
}
