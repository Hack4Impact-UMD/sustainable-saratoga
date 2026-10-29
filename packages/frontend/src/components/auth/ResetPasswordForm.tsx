import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  ClockAlert,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import icon from "@frontend/assets/Leaf logo.svg";
import { auth } from "@frontend/lib/firebase.ts";

type ResetState =
  | "checking"
  | "form"
  | "expired"
  | "used"
  | "error"
  | "success";

const PASSWORD_MIN_LENGTH = 12;

/**
 * Props for the password-reset form and its navigation actions.
 */
export interface ResetPasswordFormProps {
  oobCode: string;
  email?: string;
  onSuccess: () => void;
  onSendNewLink: () => void;
  onBackToSignIn: () => void;
}

/**
 * Handles reset-link validation, password submission, and reset-link result
 * screens. The component owns these states so the route only handles navigation.
 */
export function ResetPasswordForm({
  oobCode,
  email,
  onSuccess,
  onSendNewLink,
  onBackToSignIn,
}: ResetPasswordFormProps) {
  const [state, setState] = useState<ResetState>("checking");
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [passwordError, setPasswordError] = useState<string>();
  const [confirmationError, setConfirmationError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  // Reset links are validated before the password form is displayed.
  useEffect(() => {
    let isCurrent = true;

    /** Checks whether Firebase still accepts the reset link. */
    async function checkResetCode() {
      if (!oobCode) {
        setState("expired");
        return;
      }

      try {
        await verifyPasswordResetCode(auth, oobCode);
        if (isCurrent) setState("form");
      } catch (error) {
        if (!isCurrent) return;

        const code = getFirebaseErrorCode(error);
        if (code === "auth/expired-action-code") setState("expired");
        else if (code === "auth/invalid-action-code") setState("used");
        else setState("error");
      }
    }

    void checkResetCode();

    return () => {
      isCurrent = false;
    };
  }, [oobCode, verificationAttempt]);

  /** Validates both password fields and saves the new password in Firebase. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextPasswordError = getPasswordError(password, email);
    const nextConfirmationError =
      confirmation === password ? undefined : "Passwords don't match yet.";
    setPasswordError(nextPasswordError);
    setConfirmationError(nextConfirmationError);

    if (nextPasswordError || nextConfirmationError) return;

    // A link can expire between the initial check and this submission.
    setIsSaving(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setState("success");
    } catch (error) {
      const code = getFirebaseErrorCode(error);
      if (code === "auth/expired-action-code") setState("expired");
      else if (code === "auth/invalid-action-code") setState("used");
      else
        setPasswordError(
          code === "auth/weak-password"
            ? "Choose a stronger password."
            : "We couldn't save your password. Please try again.",
        );
    } finally {
      setIsSaving(false);
    }
  }

  if (state === "checking") {
    return null;
  }

  if (state === "error") {
    return (
      <ResetPageShell>
        <h1 className="type-h1">We couldn&apos;t check this link</h1>
        <p className="type-body-sm mt-4" role="alert">
          Please try again to continue resetting your password.
        </p>
        <ResetActions
          primaryLabel="Try again"
          onPrimary={() => {
            setState("checking");
            setVerificationAttempt((attempt) => attempt + 1);
          }}
          onSecondary={onBackToSignIn}
        />
      </ResetPageShell>
    );
  }

  // Each result state is rendered separately so its actions stay easy to adjust.
  if (state === "success") {
    return (
      <ResetPageShell>
        <h1 className="type-h1">Password updated</h1>
        <div className="mt-4 rounded-md border border-line-success bg-selected p-3 text-success">
          <div className="flex items-start gap-3">
            <CircleCheck
              className="mt-0.5 shrink-0"
              size={20}
              aria-hidden="true"
            />
            <div className="text-left">
              <p className="type-body-strong text-success">
                You can now sign in with your new password
              </p>
            </div>
          </div>
        </div>
        <button
          className="type-btn-primary mt-6 h-control w-full rounded-pill bg-primary px-4 hover:bg-primary-hover"
          type="button"
          onClick={onSuccess}
        >
          Sign in
        </button>
      </ResetPageShell>
    );
  }

  if (state === "expired") {
    return (
      <ResetPageShell>
        <h1 className="type-h1">This link has expired</h1>
        <div className="mt-4 rounded-md border border-line-warning bg-attention p-3 text-warning">
          <div className="flex items-start gap-3">
            <ClockAlert
              className="mt-0.5 shrink-0"
              size={20}
              aria-hidden="true"
            />
            <div className="text-left">
              <p className="type-body-strong text-warning">
                Reset links work for 1 hour
              </p>
              <p className="type-body-sm mt-1 text-warning">
                Send a new one{email ? " to " : ""}
                {email ? <strong>{email}</strong> : null} to continue.
              </p>
            </div>
          </div>
        </div>
        <ResetActions
          primaryLabel="Send a new link"
          onPrimary={onSendNewLink}
          onSecondary={onBackToSignIn}
        />
      </ResetPageShell>
    );
  }

  if (state === "used") {
    return (
      <ResetPageShell>
        <h1 className="type-h1">This link was already used</h1>
        <div className="mt-4 rounded-md border border-line-info bg-info-tint p-3 text-info">
          <div className="flex items-start gap-3">
            <KeyRound
              className="mt-0.5 shrink-0"
              size={20}
              aria-hidden="true"
            />
            <div className="text-left">
              <p className="type-body-strong text-info">
                Each reset link works once
              </p>
              <p className="type-body-sm mt-1 text-info">
                If you didn&apos;t finish resetting your password, send a new
                link.
              </p>
            </div>
          </div>
        </div>
        <ResetActions
          primaryLabel="Send a new link"
          onPrimary={onSendNewLink}
          onSecondary={onBackToSignIn}
        />
      </ResetPageShell>
    );
  }

  return (
    <ResetPageShell>
      <h1 className="type-h1">Choose a new password</h1>
      {email ? <p className="type-supporting mt-1">For {email}</p> : null}

      {/* The live checklist gives immediate feedback before submission. */}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        {/* Keep the two password fields independent so each eye toggle is local. */}
        <PasswordField
          id="new-password"
          label="New password"
          value={password}
          error={passwordError}
          visible={showPassword}
          onChange={(value) => {
            setPassword(value);
            setPasswordError(undefined);
          }}
          onToggleVisibility={() => setShowPassword((visible) => !visible)}
        />
        <div className="rounded-md bg-pressed p-3">
          <p className="type-body-strong">Your password needs</p>
          <p className="type-body-sm mt-1">
            {password.length >= PASSWORD_MIN_LENGTH ? "✓" : "○"} At least{" "}
            {PASSWORD_MIN_LENGTH} characters
          </p>
          <p className="type-body-sm">
            {!email || !password.toLowerCase().includes(email.toLowerCase())
              ? "✓"
              : "○"}{" "}
            Not your email address
          </p>
          <p className="type-body-sm">
            {password && password === confirmation ? "✓" : "○"} Both password
            fields match
          </p>
        </div>
        <PasswordField
          id="confirm-password"
          label="Confirm new password"
          value={confirmation}
          error={confirmationError}
          visible={showConfirmation}
          onChange={(value) => {
            setConfirmation(value);
            setConfirmationError(undefined);
          }}
          onToggleVisibility={() => setShowConfirmation((visible) => !visible)}
        />
        <button
          className="type-btn-primary h-control w-full rounded-pill bg-primary px-4 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-disabled-fill"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save new password"}
        </button>
      </form>
    </ResetPageShell>
  );
}

/** Provides the shared shell used by each reset-link result screen. */
function ResetPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen justify-center bg-page px-4 pt-24 pb-12">
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

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
}

/** Renders a password input with its visibility toggle and validation message. */
function PasswordField({
  id,
  label,
  value,
  error,
  visible,
  onChange,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <div className="text-left">
      <label className="type-h4 mb-1 block" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          className={`h-control w-full rounded-input border bg-surface px-3 pr-12 text-body outline-none focus:border-(length:--border-width-focus) focus:border-primary focus:shadow-none ${
            error
              ? "border-(length:--border-width-error) border-error"
              : "border-line-strong"
          }`}
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
        />
        <button
          className="absolute right-1 top-1/2 flex size-touch -translate-y-1/2 items-center justify-center rounded-pill p-0 text-icon-primary hover:bg-hover"
          type="button"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          onClick={onToggleVisibility}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {error ? (
        <p className="type-error mt-1 flex items-center gap-1">
          <CircleAlert size={16} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Renders the primary and secondary actions for an invalid reset link. */
function ResetActions({
  primaryLabel,
  onPrimary,
  onSecondary,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  return (
    <div className="mt-6 space-y-3">
      <button
        className="type-btn-primary h-control w-full rounded-pill bg-primary px-4 hover:bg-primary-hover"
        type="button"
        onClick={onPrimary}
      >
        {primaryLabel}
      </button>
      <button
        className="type-link flex justify-self-center"
        type="button"
        onClick={onSecondary}
      >
        ← Back to sign in
      </button>
    </div>
  );
}

/** Returns the password validation message, if the new password is invalid. */
function getPasswordError(
  password: string,
  email?: string,
): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (email && password.toLowerCase().includes(email.toLowerCase())) {
    return "Your password cannot contain your email address.";
  }

  return undefined;
}

/** Safely extracts Firebase's error code from an unknown thrown value. */
function getFirebaseErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}
