import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckMailScreen } from "@frontend/components/auth/CheckMailScreen.tsx";

/**
 * if no email entered, fall back to empty string
 */
function validateSearch(search: Record<string, unknown>): { email: string } {
  const email = search["email"];
  return { email: typeof email === "string" ? email : "" };
}

export const Route = createFileRoute("/_guest/login/check-mail")({
  validateSearch,
  component: CheckMailPage,
});

/**
 * Check your email (default state).
 * Check your email (new link sent, resend on 60-second cooldown).
 * The cooldown timer and "new link sent" state live inside CheckMailScreen
 */
function CheckMailPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();

  function handleBackToSignIn() {
    void navigate({ to: "/login" });
  }

  return <CheckMailScreen email={email} onBackToSignIn={handleBackToSignIn} />;
}
