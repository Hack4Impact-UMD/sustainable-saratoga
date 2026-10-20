/**
 * CheckMailScreen — stub for partner to implement.
 *
 * Props:
 *   email          — the address the reset link was sent to; displayed as
 *                    "If jordan.lee@example.org has an account…"
 *   onBackToSignIn — called when the user clicks "Back to sign in";
 *                    route navigates to /login
 *
 * Internal state to implement:
 *   - "Send another link" triggers a resend and starts a 60-second cooldown.
 *   - While cooling down, show "Send another link in 0:42" (L3b).
 *   - After resending, show the "New link sent" confirmation banner (L3b).
 */
export interface CheckMailScreenProps {
  email: string;
  onBackToSignIn: () => void;
}

export function CheckMailScreen(_props: CheckMailScreenProps) {
  // TODO: implement — see CheckMailScreenProps above for the expected interface
  return null;
}
