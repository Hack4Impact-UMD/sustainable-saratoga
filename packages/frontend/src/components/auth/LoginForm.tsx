/**
 * LoginForm — stub for partner to implement.
 *
 * Props:
 *   sessionExpired  — when true, show the "Your session ended" banner (L8)
 *   onSuccess       — called after a successful sign-in; route navigates to
 *                     the redirect target (or "/")
 *   onForgotPassword — called when the user clicks "Forgot password?";
 *                      route navigates to /login/forgot-password
 *   onNoAccess      — called with the user's email when Firebase confirms the
 *                      account exists but has no platform access; route
 *                      navigates to /no-access
 */
export interface LoginFormProps {
  sessionExpired?: boolean;
  onSuccess: () => void;
  onForgotPassword: () => void;
  onNoAccess: (email: string) => void;
}

export function LoginForm(_props: LoginFormProps) {
  // TODO: implement — see LoginFormProps above for the expected interface
  return null;
}
