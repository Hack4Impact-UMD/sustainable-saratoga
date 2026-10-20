import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ResetPasswordForm } from "@frontend/components/auth/ResetPasswordForm.tsx";

/**
 * Firebase appends oobCode (and optionally email) to the reset link it sends.
 * oobCode is required for the password reset to work; email is informational
 * (shown as "For jordan.lee@example.org").
 */
function validateSearch(search: Record<string, unknown>): {
  oobCode: string;
  email?: string;
} {
  const oobCode = search["oobCode"];
  const email = search["email"];

  return {
    oobCode: typeof oobCode === "string" ? oobCode : "",
    ...(typeof email === "string" ? { email } : {}),
  };
}

export const Route = createFileRoute("/_guest/reset-password")({
  validateSearch,
  component: ResetPasswordPage,
});

/**
 * L4   — Choose a new password (normal state).
 * L4b  — Link expired while the user was on this page.
 * L5   — Password updated successfully.
 * L6   — Link expired before the user arrived (detected on load).
 * L6b  — Link already used.
 *
 * All five states are inline inside ResetPasswordForm; this route supplies
 * the oobCode/email and navigation callbacks.
 */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const { oobCode, email } = Route.useSearch();

  function handleSuccess() {
    // L5 — password updated; "Sign in" button on that screen goes to /login
    void navigate({ to: "/login" });
  }

  function handleSendNewLink() {
    // L4b / L6 / L6b — send a fresh reset link; go back to forgot-password
    void navigate({ to: "/login/forgot-password" });
  }

  function handleBackToSignIn() {
    void navigate({ to: "/login" });
  }

  return (
    <ResetPasswordForm
      oobCode={oobCode}
      email={email}
      onSuccess={handleSuccess}
      onSendNewLink={handleSendNewLink}
      onBackToSignIn={handleBackToSignIn}
    />
  );
}
