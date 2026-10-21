/**
 * stub
 *
 * Props:
 * onSuccess — called with the submitted email after the reset link is sent and
 * navigates to /login/check-mail?email=...
 * onBackToSignIn — called when user clicks "Back to sign in" and navigates to /login
 */
export interface ForgotPasswordFormProps {
  onSuccess: (email: string) => void;
  onBackToSignIn: () => void;
}

export function ForgotPasswordForm(_props: ForgotPasswordFormProps) {
  // blank
  return null;
}
