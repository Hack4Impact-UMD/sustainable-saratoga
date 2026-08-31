/**
 * The authenticated caller, resolved from the Firebase ID token on the server
 * and shared with the client so both sides agree on the shape.
 */
export type Session = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
};
