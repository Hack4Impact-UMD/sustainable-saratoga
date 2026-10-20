import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckMailScreen } from "@frontend/components/auth/CheckMailScreen.tsx";

/**
 * email is required — we always navigate here from the forgot-password page
 * with it set. Fall back to an empty string so the type stays non-optional
 * and the component can render gracefully if someone lands here directly.
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
 * L3  — Check your email (default state).
 * L3b — Check your email (new link sent, resend on 60-second cooldown).
 *
 * The cooldown timer and "new link sent" state live inside CheckMailScreen —
 * this route just supplies the email and navigation callbacks.
 */
function CheckMailPage() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();

  function handleBackToSignIn() {
    void navigate({ to: "/login" });
  }

  return <CheckMailScreen email={email} onBackToSignIn={handleBackToSignIn} />;
}
