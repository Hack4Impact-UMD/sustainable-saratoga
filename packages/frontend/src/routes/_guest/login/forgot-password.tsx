import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ForgotPasswordForm } from "@frontend/components/auth/ForgotPasswordForm.tsx";

export const Route = createFileRoute("/_guest/login/forgot-password")({
  component: ForgotPasswordPage,
});

/**
 * Reset password - user enters email and clicks send reset link
 * On success, navigates to /login/check-mail with the email in search params
 * to display "If ___ has an account...".
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
