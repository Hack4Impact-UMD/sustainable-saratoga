/**
 * ResetPasswordForm — stub for partner to implement.
 *
 * Props:
 * oobCode — Firebase out-of-band code from the reset link URL
 *      and should be passed to firebase's confirmPasswordReset()
 * newPassword — the new password string; when present
 *      indicates the "confirm password" field should be shown
 * email — optional; displayed as "For ___"
 * onSuccess — called after a successful password reset and navigates to /login
 * onSendNewLink — called when user clicks "Send a new link" on any error screen
 * and navigates to /login/forgot-password
 * onBackToSignIn — called when the user clicks "Back to sign in" and navigates to /login
 * Internal states still to implement:
 * normal — oobCode is valid -> show "Choose a new password" form
 * expired-active —> oobCode expired while the user was on the page
 * success — password updated successfully
 * expired — oobCode was already expired on arrival
 * used — oobCode was already consumed
 */
export interface ResetPasswordFormProps {
  oobCode: string;
  email?: string;
  onSuccess: () => void;
  onSendNewLink: () => void;
  onBackToSignIn: () => void;
}

export function ResetPasswordForm(_props: ResetPasswordFormProps) {
  // blank
  return null;
}
