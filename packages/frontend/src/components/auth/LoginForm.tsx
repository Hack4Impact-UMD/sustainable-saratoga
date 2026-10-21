/**
 * LoginForm — stub
 *
 * Props:
 * sessionExpired — when true, show "Your session ended" banner
 * onSuccess — called after a successful sign-in; route navigates to the redirect target
 * onForgotPassword — called when the user clicks "Forgot password?" and navigates to /login/forgot-password
 * onNoAccess — called with the user's email when user exists in Firebase
 * but not authorized/verified and navigates to /no-access
 */
export interface LoginFormProps {
  sessionExpired?: boolean;
  onSuccess: () => void;
  onForgotPassword: () => void;
  onNoAccess: (email: string) => void;
}

export function LoginForm(_props: LoginFormProps) {
  // blank
  return null;
}
