import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PeoplePage } from "@frontend/components/people/PeoplePage.tsx";
import { trpc } from "@frontend/lib/trpc.ts";
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
  const profileQuery = useQuery(trpc.users.me.queryOptions());
  const isAdmin = profileQuery.data?.profile?.role === "admin";

  // Wait for the profile before deciding whether the user may enter.
  useEffect(() => {
    if (!profileQuery.isPending && !isAdmin) {
      void navigate({ to: "/" });
    }
  }, [isAdmin, navigate, profileQuery.isPending]);

  if (profileQuery.isPending) {
    return <output>Loading account...</output>;
  }

  // The redirect runs in the effect above; render nothing while it completes.
  if (profileQuery.isError || !isAdmin) {
    return null;
  }

  return <PeoplePage />;
}
