import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ForgotPasswordForm } from "@frontend/components/auth/ForgotPasswordForm.tsx";

export const Route = createFileRoute("/_guest/login/forgot-password")({
  component: ForgotPasswordPage,
});

/**
 * L2 — Reset your password.
 * User enters their email and clicks "Send reset link".
 * On success, navigates to /login/check-mail with the email in search params
 * so that page can display "If jordan.lee@example.org has an account…".
 */
function ForgotPasswordPage() {
  const navigate = useNavigate();

  function handleSuccess(email: string) {
    void navigate({
      to: "/login/check-mail",
      search: { email },
    });
  }

  function handleBackToSignIn() {
    void navigate({ to: "/login" });
  }

  return (
    <ForgotPasswordForm
      onSuccess={handleSuccess}
      onBackToSignIn={handleBackToSignIn}
    />
  );
}
