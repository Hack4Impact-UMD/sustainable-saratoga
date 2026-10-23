import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
import { auth } from "@frontend/lib/firebase.ts";
import { NoAccessScreen } from "@frontend/components/auth/NoAccessScreen.tsx";

/**
 * email is the address that was denied access — displayed as
 * "___ isn't set up for the tree tracker."
 */
function validateSearch(search: Record<string, unknown>): { email?: string } {
  const email = search["email"];
  return typeof email === "string" ? { email } : {};
}

export const Route = createFileRoute("/no-access")({
  validateSearch,
  component: NoAccessPage,
});

/**
 * No access yet. The account exists but isn't approved.
 * "Use another account" signs the user out and redirects them to /login.
 * This route lives outside _guest so authenticated-but-unapproved users
 * can reach it without being redirected away by the guest guard.
 */
function NoAccessPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();

  async function handleUseAnotherAccount() {
    await signOut(auth);
    void navigate({ to: "/login" });
  }

  return (
    <NoAccessScreen
      email={email}
      onUseAnotherAccount={() => void handleUseAnotherAccount()}
    />
  );
}
