/**
 * ForgotPasswordForm — stub for partner to implement.
 *
 * Props:
 *   onSuccess      — called with the submitted email after the reset link is
 *                    sent; route navigates to /login/check-mail?email=…
 *   onBackToSignIn — called when the user clicks "Back to sign in";
 *                    route navigates to /login
 */
export interface ForgotPasswordFormProps {
  onSuccess: (email: string) => void;
  onBackToSignIn: () => void;
}

export function ForgotPasswordForm(_props: ForgotPasswordFormProps) {
  // TODO: implement — see ForgotPasswordFormProps above for the expected interface
  return null;
}
