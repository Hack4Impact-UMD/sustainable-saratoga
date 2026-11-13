import { useMutation } from "@tanstack/react-query";
import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signInWithPopup,
} from "firebase/auth";
import type { UserCredential } from "firebase/auth";
import type { CreateUserInput } from "@repo/common";
import { signOutAndClear } from "@frontend/lib/sessionCleanup.ts";
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
  await signOutAndClear(queryClient);
}

export type GoogleLoginResult =
  | { status: "signed-in" }
  /** Google sign-in worked, but the account was never set up. */
  | { status: "no-access"; email: string | null };

/**
 * Signs in with Google. Only accounts that already have a profile get in;
 * anyone else is signed out again and told they have no access.
 */
export function useGoogleLogin(inviteToken?: string) {
  return useMutation<GoogleLoginResult, Error>({
    mutationFn: async () => {
      const credential = await signInWithGoogle();
      if (inviteToken) {
        try {
          const invitation = await queryClient.fetchQuery({
            ...trpc.invites.check.queryOptions({ token: inviteToken }),
            staleTime: 0,
          });
          if (
            invitation.status === "valid" &&
            invitation.email.toLowerCase() ===
              credential.user.email?.toLowerCase()
          ) {
            return { status: "signed-in" };
          }
          throw new Error(
            "Sign in with the email that received the invitation.",
          );
        } catch (error) {
          await signOutAndClear(queryClient);
          throw error;
        }
      }
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

function isConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data &&
    error.data.code === "CONFLICT"
  );
}

/**
 * Creates an account with Google for the invited `email`, then the profile.
 * The Google account must use the invited address. If the person already has
 * a profile, they're simply signed in.
 */
export function useGoogleSignUp() {
  const acceptInvite = useMutation(
    trpc.invites.accept.mutationOptions({ networkMode: "always" }),
  );
  const createProfile = useMutation(trpc.users.create.mutationOptions());

  return useMutation<
    { status: "accepted" | "restoring" },
    Error,
    CreateUserInput & { email: string; token?: string }
  >({
    mutationFn: async ({ email, token, ...profile }) => {
      const credential = await signInWithGoogle(email);

      if (credential.user.email?.toLowerCase() !== email.toLowerCase()) {
        await discardSignIn(credential);
        throw new WrongGoogleAccountError(email);
      }

      if (token) {
        try {
          return await acceptInvite.mutateAsync({ ...profile, token });
        } catch (error) {
          // A lost response can follow a committed acceptance. Keep the
          // Firebase account so the invitee can safely sign in and retry.
          await signOutAndClear(queryClient);
          throw error;
        }
      }

      try {
        await createProfile.mutateAsync(profile);
      } catch (error) {
        // they already have a profile, so this was really a sign-in
        if (isConflict(error)) return { status: "accepted" };
        await discardSignIn(credential);
        throw error;
      }
      return { status: "accepted" };
    },
  });
}
