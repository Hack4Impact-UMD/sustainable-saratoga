import { useMutation } from "@tanstack/react-query";
import { signOut } from "firebase/auth";
import { auth } from "@frontend/lib/firebase.ts";
import { trpc } from "@frontend/lib/trpc.ts";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  createUserInput,
  signUpInput,
  signUpPasswordRequirements,
  validateForm,
} from "@repo/common";
import type { FieldErrors, SignUpInput } from "@repo/common";
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
import { authErrorMessage } from "@frontend/lib/authErrors.ts";
import {
  useGoogleSignUp,
  WrongGoogleAccountError,
} from "@frontend/lib/useGoogleAuth.ts";
import { useSignUp } from "@frontend/lib/useSignUp.ts";
import { GoogleIcon } from "@frontend/components/auth/GoogleIcon.tsx";
import { Input } from "@frontend/components/ui/input.tsx";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@frontend/components/ui/field.tsx";
import { Separator } from "@frontend/components/ui/separator.tsx";

const volunteerTypeOptions = [
  { value: "planter", label: "Planter" },
  { value: "pruner", label: "Pruner" },
] as const;

export function SignUpForm({
  email,
  token,
  useExistingAccount = false,
  onRestoring,
  onSuccess,
  onAccountExists,
}: {
  email: string;
  token?: string;
  useExistingAccount?: boolean;
  onRestoring?: () => void;
  onSuccess: () => void;
  onAccountExists: () => void;
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<SignUpInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const lastNameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const volunteerTypesInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const signUp = useSignUp();
  const googleSignUp = useGoogleSignUp();
  const acceptInvite = useMutation(
    trpc.invites.accept.mutationOptions({ networkMode: "always" }),
  );
  const isSubmitting =
    signUp.isPending || googleSignUp.isPending || acceptInvite.isPending;
  const validationErrorCount = Object.keys(fieldErrors).length;
  const passwordChecks = signUpPasswordRequirements.map(({ test }) =>
    test(passwordValue),
  );

  /** Shows validation errors and focuses the first field that has one. */
  function showErrors(errors: FieldErrors<SignUpInput>, error?: string) {
    setFieldErrors(errors);
    setFormError(error ?? null);
    if (errors.firstName) {
      firstNameInputRef.current?.focus();
    } else if (errors.lastName) {
      lastNameInputRef.current?.focus();
    } else if (errors.password) {
      passwordInputRef.current?.focus();
    } else if (errors.confirmPassword) {
      confirmPasswordInputRef.current?.focus();
    } else if (errors.volunteerTypes) {
      volunteerTypesInputRef.current?.focus();
    }
  }

  function finish(result: { status: "accepted" | "restoring" }) {
    if (result.status === "restoring") onRestoring?.();
    else onSuccess();
  }

  /**
   * Creates the account with Google instead of a password. The name and
   * volunteer types still come from the form; the password fields are skipped.
   */
  async function handleGoogleSignUp() {
    const form = formRef.current;
    if (!form) return;
    setFormError(null);
    setHasSubmitted(true);

    const formData = new FormData(form);
    const validation = validateForm(createUserInput, {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      volunteerTypes: formData.getAll("volunteerTypes"),
    });
    if (!validation.ok) {
      showErrors(validation.errors, validation.formError);
      return;
    }

    setFieldErrors({});
    try {
      finish(
        await googleSignUp.mutateAsync({
          ...validation.data,
          email,
          ...(token && { token }),
        }),
      );
    } catch (error) {
      if (error instanceof WrongGoogleAccountError) {
        setFormError(
          `That Google account doesn't match your invite. Choose the Google account for ${email}, or create a password instead.`,
        );
      } else if (authErrorMessage(error, "google")) {
        // null means they closed the Google popup, which isn't an error
        setFormError(
          "We couldn't create your account with Google. Please try again.",
        );
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setHasSubmitted(true);

    const formData = new FormData(event.currentTarget);
    if (token && useExistingAccount) {
      const validation = validateForm(createUserInput, {
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        volunteerTypes: formData.getAll("volunteerTypes"),
      });
      if (!validation.ok) {
        showErrors(validation.errors, validation.formError);
        return;
      }
      setFieldErrors({});
      try {
        finish(await acceptInvite.mutateAsync({ token, ...validation.data }));
      } catch {
        setFormError(
          "We couldn't accept the invitation. Try again or sign out.",
        );
      }
      return;
    }
    const validation = validateForm(signUpInput, {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      volunteerTypes: formData.getAll("volunteerTypes"),
      email,
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!validation.ok) {
      showErrors(validation.errors, validation.formError);
      return;
    }

    setFieldErrors({});
    try {
      finish(
        await signUp.mutateAsync({
          ...validation.data,
          ...(token && { token }),
        }),
      );
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : undefined;
      if (code === "auth/email-already-in-use") {
        onAccountExists();
      } else {
        setFormError(
          code === "auth/weak-password"
            ? "Your password does not meet the required criteria."
            : "We couldn't create your account. Please try again.",
        );
      }
    }
  }

  return (
    <div className="min-h-screen w-full pt-[60px] pb-[34px] px-4 md:px-8 max-w-7xl mx-auto text-heading">
      <div className="grid grid-cols-4 md:grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-4 md:col-start-4 md:col-span-6 flex flex-col gap-4 rounded-md bg-page p-4">
          <header>
            <img
              src={icon}
              alt="Sustainable Saratoga Logo"
              className="w-20 h-20 mx-auto"
            />
            <h1 className="type-h1 text-center">Create Account</h1>
          </header>
          <form
            ref={formRef}
            className="flex flex-col gap-4"
            noValidate
            onSubmit={handleSubmit}
          >
            {hasSubmitted && validationErrorCount > 0 && (
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
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <div className="relative w-full">
                <Input
                  id="email"
                  placeholder="name@example.org"
                  value={email}
                  className="h-12 rounded-input border border-line-strong bg-surface px-4 pr-12"
                  required
                  disabled
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? "email-error" : undefined
                  }
                />
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-icon-secondary"
                />
              </div>
              {fieldErrors.email && (
                <FieldError
                  id="email-error"
                  className="flex items-center gap-2"
                >
                  <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
                  {fieldErrors.email}
                </FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="firstName">First Name</FieldLabel>
              <Input
                id="firstName"
                name="firstName"
                ref={firstNameInputRef}
                placeholder="First name"
                className="bg-surface border border-line-strong px-4 h-12 rounded-input"
                required
                autoComplete="given-name"
                aria-invalid={Boolean(fieldErrors.firstName)}
                aria-describedby={
                  fieldErrors.firstName ? "firstName-error" : undefined
                }
              />
              {fieldErrors.firstName && (
                <FieldError
                  id="firstName-error"
                  className="flex items-center gap-2"
                >
                  <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
                  {fieldErrors.firstName}
                </FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
              <Input
                id="lastName"
                name="lastName"
                ref={lastNameInputRef}
                placeholder="Last name"
                className="bg-surface border border-line-strong px-4 h-12 rounded-input"
                required
                autoComplete="family-name"
                aria-invalid={Boolean(fieldErrors.lastName)}
                aria-describedby={
                  fieldErrors.lastName ? "lastName-error" : undefined
                }
              />
              {fieldErrors.lastName && (
                <FieldError
                  id="lastName-error"
                  className="flex items-center gap-2"
                >
                  <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
                  {fieldErrors.lastName}
                </FieldError>
              )}
            </Field>
            {!useExistingAccount && (
              <>
                <Field>
                  <FieldLabel htmlFor="password">Create a Password</FieldLabel>
                  <div className="relative w-full">
                    <Input
                      id="password"
                      name="password"
                      ref={passwordInputRef}
                      type={isPasswordVisible ? "text" : "password"}
                      placeholder=""
                      className="h-12 rounded-input border border-line-strong bg-surface px-4 pr-12"
                      required
                      autoComplete="new-password"
                      onChange={(event) => {
                        setPasswordValue(event.currentTarget.value);
                        setPasswordTouched(true);
                        setFieldErrors(
                          ({ password: _password, ...rest }) => rest,
                        );
                        setFormError(null);
                      }}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={
                        fieldErrors.password
                          ? "password-error"
                          : "password-requirements"
                      }
                    />
                    <button
                      type="button"
                      aria-label={
                        isPasswordVisible ? "Hide password" : "Show password"
                      }
                      aria-pressed={isPasswordVisible}
                      onClick={() =>
                        setIsPasswordVisible((visible) => !visible)
                      }
                      className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-icon-secondary hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {isPasswordVisible ? (
                        <EyeOff aria-hidden="true" className="size-5" />
                      ) : (
                        <Eye aria-hidden="true" className="size-5" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <FieldError
                      id="password-error"
                      className="flex items-center gap-2"
                    >
                      <CircleAlert
                        aria-hidden="true"
                        className="size-5 shrink-0"
                      />
                      {fieldErrors.password}
                    </FieldError>
                  )}
                </Field>

                <div
                  id="password-requirements"
                  className="bg-pressed py-3 px-4 rounded-md"
                >
                  <h2 className="font-bold">Your password needs</h2>
                  <ul className="mt-2">
                    {signUpPasswordRequirements.map(({ label }, index) => {
                      const passed =
                        passwordTouched || hasSubmitted
                          ? passwordChecks[index]
                          : undefined;

                      return (
                        <li
                          key={label}
                          className={`flex items-center gap-2 ${
                            passed === true
                              ? "text-success"
                              : passed === false
                                ? "text-destructive"
                                : ""
                          }`}
                        >
                          {passed === true ? (
                            <CircleCheck
                              aria-hidden="true"
                              className="size-5"
                            />
                          ) : passed === false ? (
                            <CircleX aria-hidden="true" className="size-5" />
                          ) : (
                            <Circle
                              aria-hidden="true"
                              className="size-5 text-icon-secondary"
                            />
                          )}
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <Field>
                  <FieldLabel htmlFor="confirmPassword">
                    Confirm Password
                  </FieldLabel>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    ref={confirmPasswordInputRef}
                    type="password"
                    placeholder=""
                    className="h-12 rounded-input border border-line-strong bg-surface px-4"
                    required
                    autoComplete="new-password"
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby={
                      fieldErrors.confirmPassword
                        ? "confirmPassword-error"
                        : undefined
                    }
                  />
                  {fieldErrors.confirmPassword && (
                    <FieldError
                      id="confirmPassword-error"
                      className="flex items-center gap-2"
                    >
                      <CircleAlert
                        aria-hidden="true"
                        className="size-5 shrink-0"
                      />
                      {fieldErrors.confirmPassword}
                    </FieldError>
                  )}
                </Field>
              </>
            )}

            <FieldSet
              aria-invalid={Boolean(fieldErrors.volunteerTypes)}
              aria-describedby={
                fieldErrors.volunteerTypes ? "volunteerTypes-error" : undefined
              }
            >
              <FieldLegend>Volunteer type</FieldLegend>
              <div className="flex flex-col gap-2">
                {volunteerTypeOptions.map(({ value, label }, index) => (
                  <label key={value} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="volunteerTypes"
                      value={value}
                      ref={index === 0 ? volunteerTypesInputRef : undefined}
                      className="size-5 accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {fieldErrors.volunteerTypes && (
                <FieldError
                  id="volunteerTypes-error"
                  className="flex items-center gap-2"
                >
                  <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
                  {fieldErrors.volunteerTypes}
                </FieldError>
              )}
            </FieldSet>

            {formError && <FieldError>{formError}</FieldError>}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="type-btn-primary h-control w-full rounded-full bg-primary px-5 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {useExistingAccount
                  ? "Continue with this account"
                  : signUp.isPending
                    ? "Creating Account..."
                    : "Create Account"}
              </button>
              {useExistingAccount ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="type-link mt-2 min-h-11"
                  onClick={() => void signOut(auth)}
                >
                  Sign out
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-6 py-4">
                    <Separator className="w-auto flex-1" />
                    <span className="type-body text-body-muted">or</span>
                    <Separator className="w-auto flex-1" />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleGoogleSignUp()}
                    disabled={isSubmitting}
                    className="type-btn-secondary flex h-control w-full items-center justify-center gap-3 rounded-full border border-primary bg-surface px-5 hover:bg-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <GoogleIcon />
                    <span>
                      {googleSignUp.isPending
                        ? "Creating Account..."
                        : "Continue with Google"}
                    </span>
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
