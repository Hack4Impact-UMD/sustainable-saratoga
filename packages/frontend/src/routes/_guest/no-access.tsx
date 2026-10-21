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
 * No access yet. The account exists but isn't approved
 * "Use another account" signs the user out and redirects them to /login.
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
