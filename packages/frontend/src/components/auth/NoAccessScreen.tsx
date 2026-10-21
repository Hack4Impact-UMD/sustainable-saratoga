/**
 * NoAccessScreen — stub for partner to implement.
 *
 * Props:
 * email — the address that was denied access; displayed as "___ isn't set up for the tree tracker."
 * onUseAnotherAccount - called when the user clicks "Use another account" and navigates back to /login
 */
export interface NoAccessScreenProps {
  email?: string;
  onUseAnotherAccount: () => void;
}

export function NoAccessScreen(_props: NoAccessScreenProps) {
  // blank
  return null;
}
