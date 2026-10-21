import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import {
  Circle,
  CircleAlert,
  CircleCheck,
  CircleX,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";
import icon from "@frontend/assets/Leaf logo.svg";
import { auth } from "@frontend/lib/firebase.ts";
import { Input } from "@frontend/components/ui/input";
import { Field, FieldError, FieldLabel } from "@frontend/components/ui/field";

const invitedEmail = "test1@example.com"; // TODO: Replace with actual invited email

export function SignUpForm({
  onSuccess,
  onAccountExists,
}: {
  onSuccess: () => void;
  onAccountExists: () => void;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [passwordWasValidOnSubmit, setPasswordWasValidOnSubmit] =
    useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const validationErrorCount =
    Number(Boolean(nameError)) + Number(Boolean(passwordError));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setHasSubmitted(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextNameError = name ? null : "Enter your name.";
    const nextPasswordError =
      password.length >= 8 ? null : "Use at least 8 characters.";

    setNameError(nextNameError);
    setPasswordError(nextPasswordError);
    setPasswordWasValidOnSubmit(nextPasswordError === null);

    if (nextNameError || nextPasswordError) {
      if (nextNameError) {
        nameInputRef.current?.focus();
      } else {
        passwordInputRef.current?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        invitedEmail,
        password,
      );
      await updateProfile(user, { displayName: name });
      onSuccess();
    } catch (cause) {
      const code =
        typeof cause === "object" && cause !== null && "code" in cause
          ? cause.code
          : undefined;
      if (code === "auth/email-already-in-use") {
        onAccountExists();
      } else {
        setFormError(
          code === "auth/weak-password"
            ? "Your password must be at least 8 characters."
            : "We couldn't create your account. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full pt-[60px] pb-[34px] px-4 md:px-8 max-w-7xl mx-auto text-heading">
      <div className="grid grid-cols-4 md:grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-4 md:col-start-4 md:col-span-6 flex flex-col gap-4 rounded-md bg-page p-4">
          <header>
            <img src={icon} alt="Sustainable Saratoga Logo" className="w-20 h-20 mx-auto" />
            <h1 className="type-h1 text-center">Create Account</h1>
          </header>
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={handleSubmit}
          >
            {hasSubmitted && (nameError || passwordError) && (
              <div
                role="alert"
                className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 font-bold text-destructive"
              >
                <CircleAlert className="size-6 shrink-0" />
                <span>
                  Fix {validationErrorCount}{" "}
                  {validationErrorCount === 1 ? "thing" : "things"} to create
                  your account
                </span>
              </div>
            )}
            <Field className="text-bold">
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <div className="relative w-full">
                <Input
                  id="email"
                  placeholder="name@example.org"
                  value={invitedEmail}
                  className="h-12 rounded-input border border-line-strong bg-surface px-4 pr-12"
                  required
                  disabled
                />
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-icon-secondary"
                />
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                ref={nameInputRef}
                placeholder="Your Name"
                className="bg-surface border border-line-strong px-4 h-12 rounded-input"
                required
                autoComplete="name"
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? "name-error" : undefined}
              />
              {nameError && (
                <FieldError id="name-error" className="flex items-center gap-2">
                  <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
                  {nameError}
                </FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Create a Password</FieldLabel>
              <div className="relative w-full">
                <Input
                  id="password"
                  name="password"
                  ref={passwordInputRef}
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 rounded-input border border-line-strong bg-surface px-4 pr-12"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={
                    passwordError ? "password-error" : "password-requirements"
                  }
                />
                <button
                  type="button"
                  aria-label={
                    isPasswordVisible ? "Hide password" : "Show password"
                  }
                  aria-pressed={isPasswordVisible}
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-icon-secondary hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {isPasswordVisible ? (
                    <EyeOff aria-hidden="true" className="size-5" />
                  ) : (
                    <Eye aria-hidden="true" className="size-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <FieldError
                  id="password-error"
                  className="flex items-center gap-2"
                >
                  <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
                  {passwordError}
                </FieldError>
              )}
            </Field>

            <div
              id="password-requirements"
              className="bg-pressed py-3 px-4 rounded-md"
            >
              <h2 className="font-bold">Your password needs</h2>
              <ul className="mt-2">
                <li
                  className={
                    hasSubmitted && passwordWasValidOnSubmit
                      ? "flex items-center gap-2 text-success"
                      : hasSubmitted
                        ? "flex items-center gap-2 text-destructive"
                        : "flex items-center gap-2"
                  }
                >
                  {hasSubmitted && passwordWasValidOnSubmit ? (
                    <CircleCheck className="size-5" />
                  ) : hasSubmitted ? (
                    <CircleX className="size-5" />
                  ) : (
                    <Circle className="size-5 text-icon-secondary" />
                  )}
                  At least 8 characters
                </li>
              </ul>
            </div>

            {formError && <FieldError>{formError}</FieldError>}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="type-btn-primary h-control w-full rounded-full bg-primary px-5 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </button>
              <div
                className="flex items-center gap-6 py-4"
                role="separator"
                aria-label="or"
              >
                <span className="h-px flex-1 bg-divider" />
                <span className="type-body text-body-muted">or</span>
                <span className="h-px flex-1 bg-divider" />
              </div>
              <button
                type="button"
                className="type-btn-secondary flex h-control w-full items-center justify-center gap-3 rounded-full border border-primary bg-surface px-5 hover:bg-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 cursor-pointer"
              >
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-md border-2 border-dashed border-line-strong font-bold"
                >
                  G
                </span>
                <span>Continue with Google</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
