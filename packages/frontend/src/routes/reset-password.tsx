import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ResetPasswordForm } from "@frontend/components/auth/ResetPasswordForm.tsx";

/**
 * Firebase appends oobCode (and optionally email) to the reset link it sends.
 * oobCode is required for the password reset to work; email is informational
 * (shown as "For ___").
 * This route lives outside _guest so authenticated users who follow a reset
 * link from their email can still reach it.
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

export const Route = createFileRoute("/reset-password")({
  validateSearch,
  component: ResetPasswordPage,
});

/**
 * Possible States:
 * Choose a new password (normal state) (1)
 * Link expired while the user was on this page (2)
 * Password updated successfully (3)
 * Link expired before the user arrived (detected on load) (4)
 * Link already used (5)
 */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const { oobCode, email } = Route.useSearch();

  function handleSuccess() {
    // 3 - go to login page
    void navigate({ to: "/login" });
  }

  function handleSendNewLink() {
    // 2, 4, 5
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
