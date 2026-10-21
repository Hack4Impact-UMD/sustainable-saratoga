/**
 * CheckMailScreen — stub for partner to implement.
 *
 * Props:
 * email — the address the reset link was sent to displayed as "If ___ has an account..."
 * onBackToSignIn — called when the user clicks "Back to sign in" and navigates to /login
 * Internal state still needed to implement:
 *      "Send another link" triggers a resend and starts a 60-second cooldown.
 *      While cooling down, show "Send another link in (time counting down)"
 *      After resending, show the "New link sent" confirmation banner.
 */
export interface CheckMailScreenProps {
  email: string;
  onBackToSignIn: () => void;
}

export function CheckMailScreen(_props: CheckMailScreenProps) {
  // blank
  return null;
}
