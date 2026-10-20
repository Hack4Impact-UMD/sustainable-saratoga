import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoginForm } from "@frontend/components/auth/LoginForm.tsx";

/**
 * Validates the ?redirect= and ?reason= search params.
 *
 * - redirect: only kept when it's a same-origin path (starts with "/"),
 *   preventing open-redirect attacks.
 * - reason: only "session-expired" is a recognised value; anything else
 *   is dropped so arbitrary strings can't appear in the UI.
 */
function validateSearch(search: Record<string, unknown>): {
  redirect?: string;
  reason?: "session-expired";
} {
  const redirect = search["redirect"];
  const reason = search["reason"];

  return {
    ...(typeof redirect === "string" && redirect.startsWith("/")
      ? { redirect }
      : {}),
    ...(reason === "session-expired" ? { reason } : {}),
  };
}

export const Route = createFileRoute("/_guest/login")({
  validateSearch,
  component: LoginPage,
});

/**
 * L1 — Sign in page.
 * L8 — Same page, but with a "Your session ended" banner when
 *       ?reason=session-expired is present in the URL.
 */
function LoginPage() {
  const navigate = useNavigate();
  const { redirect, reason } = Route.useSearch();

  function handleSuccess() {
    void navigate({ to: redirect ?? "/" });
  }

  function handleForgotPassword() {
    void navigate({ to: "/login/forgot-password" });
  }

  function handleNoAccess(email: string) {
    void navigate({ to: "/no-access", search: { email } });
  }

  return (
    <LoginForm
      sessionExpired={reason === "session-expired"}
      onSuccess={handleSuccess}
      onForgotPassword={handleForgotPassword}
      onNoAccess={handleNoAccess}
    />
  );
}
