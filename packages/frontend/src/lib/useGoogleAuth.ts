import { useMutation } from "@tanstack/react-query";
import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import type { UserCredential } from "firebase/auth";
import type { CreateUserInput } from "@repo/common";
import { auth } from "@frontend/lib/firebase.ts";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

/** Opens the Google account picker, suggesting `email` when it's known. */
function signInWithGoogle(email?: string): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account",
    ...(email ? { login_hint: email } : {}),
  });
  return signInWithPopup(auth, provider);
}

/**
 * Signs out, first deleting the Firebase account if this sign-in just created
 * it, so a stray Google sign-in doesn't leave an empty account behind.
 */
async function discardSignIn(credential: UserCredential) {
  if (getAdditionalUserInfo(credential)?.isNewUser) {
    try {
      await credential.user.delete();
    } catch (error) {
      console.error("Could not delete the unused Google account", error);
    }
  }
  await signOut(auth);
}

export type GoogleLoginResult =
  | { status: "signed-in" }
  /** Google sign-in worked, but the account was never set up. */
  | { status: "no-access"; email: string | null };

/**
 * Signs in with Google. Only accounts that already have a profile get in;
 * anyone else is signed out again and told they have no access.
 */
export function useGoogleLogin() {
  return useMutation<GoogleLoginResult, Error>({
    mutationFn: async () => {
      const credential = await signInWithGoogle();
      const { profile } = await queryClient.fetchQuery({
        ...trpc.users.me.queryOptions(),
        staleTime: 0,
      });

      if (!profile) {
        await discardSignIn(credential);
        return { status: "no-access", email: credential.user.email };
      }
      return { status: "signed-in" };
    },
  });
}

/** Thrown when the Google account's email isn't the invited address. */
export class WrongGoogleAccountError extends Error {
  readonly expectedEmail: string;

  constructor(expectedEmail: string) {
    super(`Choose the Google account for ${expectedEmail}.`);
    this.name = "WrongGoogleAccountError";
    this.expectedEmail = expectedEmail;
  }
}

/**
 * Creates an account with Google for the invited `email`, then the profile.
 * The Google account must use the invited address. If the person already has
 * a profile, they're simply signed in.
 */

// when signing in with google and accepts the inivite, the google account must match that invited email
export function useGoogleSignUp() {
  const acceptInvitation = useMutation(trpc.invites.accept.mutationOptions());

  return useMutation<
    void,
    Error,
    CreateUserInput & {
      email: string;
      token: string;
    }
  >({
    mutationFn: async ({ email, token, ...profile }) => {
      const credential = await signInWithGoogle(email);

      if (credential.user.email?.toLowerCase() !== email.toLowerCase()) {
        await discardSignIn(credential);
        throw new WrongGoogleAccountError(email);
      }

      // acceptInvite commits the profile and the accepted invite status in one
      // transaction. A failure here -- including a CONFLICT from a replayed
      // request -- may have happened after that commit, so deleting the account
      // would leave the invite accepted with no working login. Preserve the
      // account and surface the error; CONFLICT is not treated as a successful
      // sign-in, since a different account may have consumed the invite.
      await acceptInvitation.mutateAsync({
        token,
        firstName: profile.firstName,
        lastName: profile.lastName,
        volunteerTypes: profile.volunteerTypes,
      });
    },
  });
}
