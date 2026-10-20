/**
 * ResetPasswordForm — stub for partner to implement.
 *
 * Props:
 *   oobCode        — Firebase out-of-band code from the reset link URL;
 *                    pass to confirmPasswordReset(auth, oobCode, newPassword)
 *   email          — optional; displayed as "For jordan.lee@example.org"
 *   onSuccess      — called after a successful password reset (L5);
 *                    route navigates to /login
 *   onSendNewLink  — called when the user clicks "Send a new link" on any
 *                    error screen (L4b, L6, L6b); route navigates to
 *                    /login/forgot-password
 *   onBackToSignIn — called when the user clicks "Back to sign in";
 *                    route navigates to /login
 *
 * Internal states to implement (driven by verifyPasswordResetCode result):
 *   - L4   normal    — oobCode is valid; show "Choose a new password" form
 *   - L4b  expired-active — oobCode expired while the user was on the page
 *   - L5   success   — password updated successfully
 *   - L6   expired   — oobCode was already expired on arrival
 *   - L6b  used      — oobCode was already consumed
 */
export interface ResetPasswordFormProps {
  oobCode: string;
  email?: string;
  onSuccess: () => void;
  onSendNewLink: () => void;
  onBackToSignIn: () => void;
}

export function ResetPasswordForm(_props: ResetPasswordFormProps) {
  // TODO: implement — see ResetPasswordFormProps above for the expected interface
  return null;
}
