import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { LoginForm } from "@frontend/components/auth/LoginForm.tsx";

/**
 * redirect: only kept if it's a same-origin path (starts with "/") to prevent open-redirect attacks
 * reason: only "session-expired" is valid, anything else is dropped
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
 * Sign in page. Also handles the session expired state when
 * ?reason=session-expired is in the URL, showing a "Your session ended" banner.
 */
function LoginPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { redirect, reason } = Route.useSearch();

  // This route also owns /login/* child routes. Render those children through
  // the outlet instead of leaving them hidden behind the login form.
  if (pathname !== "/login") {
    return <Outlet />;
  }

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
