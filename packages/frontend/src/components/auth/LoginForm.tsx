import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CircleAlert, CloudAlert, Eye, EyeOff, Info } from "lucide-react";
import icon from "@frontend/assets/Leaf logo.svg";
import {
  authErrorMessage,
  emailFieldError,
  passwordFieldError,
} from "@frontend/lib/authErrors.ts";
import { useLogin } from "@frontend/lib/useLogin.ts";
import { useAuth } from "@frontend/lib/useAuth.ts";

/**
 * Props for the sign-in form and its navigation actions.
 */
export interface LoginFormProps {
  sessionExpired?: boolean;
  onSuccess: () => void;
  onForgotPassword: () => void;
}

/**
 * Renders the email/password sign-in form shown on the guest login page.
 */
export function LoginForm({
  sessionExpired = false,
  onSuccess,
  onForgotPassword,
}: LoginFormProps) {
  const login = useLogin();
  const { isAuthed } = useAuth();
  const didNavigate = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();

  // App passes this auth state to the router before effects run, so route
  // guards see the signed-in user when the success action navigates.
  useEffect(() => {
    if (login.isSuccess && isAuthed && !didNavigate.current) {
      didNavigate.current = true;
      onSuccess();
    }
  }, [login.isSuccess, isAuthed, onSuccess]);

  // TanStack Query exposes the Firebase request status and any auth failure.
  const signInError = login.isError
    ? authErrorMessage(login.error, "password")
    : null;

  /** Validates the submitted credentials and starts the Firebase login mutation. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEmailError = emailFieldError(email);
    const nextPasswordError = passwordFieldError(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) return;

    login.mutate({ email: email.trim(), password });
  }

  return (
    <main className="flex min-h-screen justify-center bg-page px-4 pt-24 pb-12">
      <section className="flex min-h-[calc(100vh-9rem)] w-full max-w-md flex-col">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <img
            src={icon}
            alt="Sustainable Saratoga"
            className="w-24"
          />
          <h1 className="type-h1">Sign in</h1>
        </div>

        {/* This banner is shown when an authenticated session has expired. */}
        {sessionExpired ? (
          <div
            className="mb-4 rounded-md border border-line-info bg-info-tint p-3 text-info"
            role="status"
          >
            <div className="flex items-start gap-3">
              <CircleAlert
                className="mt-0.5 shrink-0"
                size={20}
                aria-hidden="true"
              />
              <div className="text-left">
                <p className="type-body-strong text-info">Your session ended</p>
                <p className="type-body-sm text-info">
                  Sign in again to continue.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Firebase failures are mapped to the design's warning or error banner. */}
        {signInError ? (
          <div
            className={`mb-4 rounded-md border p-3 ${
              signInError.variant === "warning"
                ? "border-[#E6CF9E] bg-[#FBF0D9] text-warning"
                : "border-line-error bg-error-tint text-error"
            }`}
            role="alert"
          >
            <div className="flex items-start gap-3">
              {signInError.variant === "warning" ? (
                <CloudAlert
                  className="mt-0.5 shrink-0"
                  size={20}
                  aria-hidden="true"
                />
              ) : (
                <CircleAlert
                  className="mt-0.5 shrink-0"
                  size={20}
                  aria-hidden="true"
                />
              )}
              <div className="text-left">
                {signInError.title ? (
                  <p
                    className={`type-body-strong ${
                      signInError.variant === "warning"
                        ? "text-warning"
                        : "text-error"
                    }`}
                  >
                    {signInError.title}
                  </p>
                ) : null}
                <p
                  className={`type-body-sm ${
                    signInError.variant === "warning"
                      ? "text-warning"
                      : "text-error"
                  }`}
                >
                  {signInError.message}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {/* Each field owns its validation message and accessible error link. */}
          <div>
            <label className="type-h4 mb-1 block" htmlFor="login-email">
              Email
            </label>
            <input
              className={`h-control w-full rounded-input border bg-surface px-3 text-body outline-none focus:border-(length:--border-width-focus) focus:border-primary focus:shadow-none ${
                emailError
                  ? "border-(length:--border-width-error) border-error"
                  : "border-line-strong"
              }`}
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.org"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError(undefined);
              }}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "login-email-error" : undefined}
            />
            {emailError ? (
              <p
                className="type-error mt-1 flex items-center gap-1"
                id="login-email-error"
              >
                <CircleAlert size={16} aria-hidden="true" />
                {emailError}
              </p>
            ) : null}
          </div>

          <div>
            <label className="type-h4 mb-1 block" htmlFor="login-password">
              Password
            </label>
            <div className="relative">
              <input
                className={`h-control w-full rounded-input border bg-surface px-3 pr-12 text-body outline-none focus:border-(length:--border-width-focus) focus:border-primary focus:shadow-none ${
                  passwordError
                    ? "border-(length:--border-width-error) border-error"
                    : "border-line-strong"
                }`}
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordError) setPasswordError(undefined);
                }}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={
                  passwordError ? "login-password-error" : undefined
                }
              />
              <button
                className="absolute right-1 top-1/2 flex size-touch -translate-y-1/2 items-center justify-center rounded-pill p-0 text-icon-primary hover:bg-hover"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {passwordError ? (
              <p
                className="type-error mt-1 flex items-center gap-1"
                id="login-password-error"
              >
                <CircleAlert size={16} aria-hidden="true" />
                {passwordError}
              </p>
            ) : null}
          </div>

          <div className="text-right">
            <button
              className="type-link"
              type="button"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          <button
            className="type-btn-primary h-control w-full rounded-pill bg-primary px-4 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-disabled-fill"
            type="submit"
            disabled={login.isPending || login.isSuccess}
          >
            {login.isPending || login.isSuccess ? "Signing in..." : "Sign in"}
          </button>

          <div className="relative flex items-center gap-(--space-4)">
            <div className="grow border-t border-(--color-divider)"></div>
            <span className="shrink text-(--color-text-muted)">or</span>
            <div className="grow border-t border-(--color-divider)"></div>
          </div>

          <button
            className="flex h-12 w-full justify-center items-center gap-(--space-2) rounded-(--radius-pill) border border-solid border-(--color-primary) bg-(--bg-surface) px-20.5 py-0"
            type="button"
          >
            <div className="flex px-1.75 justify-center items-center border-[1.5px] border-dashed border-(--color-border-strong) rounded-sm ">
              <p className="font-bold text-[10px] text-(--color-text-muted)">
                G
              </p>
            </div>
            {/* Insert Google login logic here */}
            Continue with Google
          </button>
        </form>

        <p className="type-caption mt-auto flex items-center justify-center gap-1 pt-(--space-4) text-center">
          <Info aria-hidden="true" size={16} />
          <strong>Need access?</strong> Contact your administrator.
        </p>
      </section>
    </main>
  );
}
