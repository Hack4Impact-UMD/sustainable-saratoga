import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { NoAccessScreen } from "@frontend/components/auth/NoAccessScreen.tsx";

/**
 * email is the address that was denied access — displayed as
 * "priya.personal@example.com isn't set up for the tree tracker."
 */
function validateSearch(search: Record<string, unknown>): { email?: string } {
  const email = search["email"];
  return typeof email === "string" ? { email } : {};
}

export const Route = createFileRoute("/_guest/no-access")({
  validateSearch,
  component: NoAccessPage,
});

/**
 * L7 — No access yet.
 * The account exists in Firebase but hasn't been approved.
 * "Use another account" signs the user out and returns them to /login.
 */
function NoAccessPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();

  function handleUseAnotherAccount() {
    void navigate({ to: "/login" });
  }

  return (
    <NoAccessScreen
      email={email}
      onUseAnotherAccount={handleUseAnotherAccount}
    />
  );
}
