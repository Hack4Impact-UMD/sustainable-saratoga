import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import icon from "@frontend/assets/Leaf logo.svg";
import { auth } from "@frontend/lib/firebase.ts";
import { emailFieldError } from "@frontend/lib/authErrors.ts";

/**
 * Props for the password-recovery form and its navigation actions.
 */
export interface ForgotPasswordFormProps {
  onSuccess: (email: string) => void;
  onBackToSignIn: () => void;
}

/**
 * Collects an email address and asks Firebase to send a password-reset link.
 */
export function ForgotPasswordForm({
  onSuccess,
  onBackToSignIn,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [isSending, setIsSending] = useState(false);

  // The component keeps field errors separate from Firebase request errors.
  /** Validates the address, requests a reset email, and advances to check-mail. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEmailError = emailFieldError(email);
    setEmailError(nextEmailError);
    setSubmitError(undefined);

    if (nextEmailError) return;

    setIsSending(true);
    try {
      const normalizedEmail = email.trim();
      // Firebase sends the link; the route changes views only after success.
      await sendPasswordResetEmail(auth, normalizedEmail);
      onSuccess(normalizedEmail);
    } catch {
      // Keep this message generic so the UI does not reveal whether an account
      // exists for a particular email address.
      setSubmitError(
        "We couldn't send a reset link right now. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ForgotPageShell>
      <h1 className="type-h1">Reset your password</h1>
      <p className="type-supporting mt-1">
        We&apos;ll email you a link to set a new one.
      </p>

      {/* Keep account-related failures generic to avoid revealing account existence. */}
      {submitError ? (
        <div
          className="mt-6 rounded-md border border-line-error bg-error-tint p-3 text-error"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            <div className="text-left">
              <p className="type-body-sm text-error">{submitError}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* The form intentionally validates on submit so the layout stays stable. */}
      <form className="mt-6 space-y-4 text-left" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="type-h4 mb-1 block" htmlFor="forgot-password-email">
            Email
          </label>
          <div className="relative">
            <input
              className={`h-control w-full rounded-input border bg-surface px-3 pr-12 text-body outline-none focus:border-(length:--border-width-focus) focus:border-primary focus:shadow-none ${
                emailError
                  ? "border-(length:--border-width-error) border-error"
                  : "border-line-strong"
              }`}
              id="forgot-password-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.org"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError(undefined);
                if (submitError) setSubmitError(undefined);
              }}
              aria-invalid={Boolean(emailError)}
              aria-describedby={
                emailError ? "forgot-password-email-error" : undefined
              }
            />
          </div>
          {emailError ? (
            <p
              className="type-error mt-1 flex items-center gap-1"
              id="forgot-password-email-error"
            >
              <CircleAlert size={16} aria-hidden="true" />
              {emailError}
            </p>
          ) : null}
        </div>

        <button
          className="type-btn-primary h-control w-full rounded-pill bg-primary px-4 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-disabled-fill"
          type="submit"
          disabled={isSending}
        >
          {isSending ? "Sending..." : "Send reset link"}
        </button>
        <button
          className="type-btn-secondary h-control w-full rounded-pill border border-primary bg-surface px-4 hover:bg-hover"
          type="button"
          onClick={onBackToSignIn}
        >
          Back to sign in
        </button>
      </form>
    </ForgotPageShell>
  );
}

/** Provides the shared logo, page background, and centered auth layout. */
function ForgotPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen justify-center bg-page px-4 py-8">
      <section className="w-full max-w-md text-center">
        <img
          src={icon}
          alt="Sustainable Saratoga"
          className="mx-auto mb-4 h-auto w-24"
        />
        {children}
      </section>
    </main>
  );
}
