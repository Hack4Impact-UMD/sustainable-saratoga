import { useMutation } from "@tanstack/react-query";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import type { User } from "firebase/auth";
import type { SignUpInput } from "@repo/common";
import { auth } from "@frontend/lib/firebase.ts";
import { trpc } from "@frontend/lib/trpc.ts";

/**
 * Creates the Firebase account for an invited volunteer, then their profile.
 * @returns A TanStack Query mutation for starting sign-up and tracking its
 * loading, success, and error states.
 */
export function useSignUp() {
  const acceptInvitation = useMutation(trpc.invites.accept.mutationOptions());

  return useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
      volunteerTypes,
      token,
    }: SignUpInput & { token: string }) => {
      // A previous attempt may have created the Firebase account and signed
      // the user in before acceptInvitation failed. Reuse that account instead
      // of calling createUserWithEmailAndPassword again, which would throw
      // auth/email-already-in-use and route the user to login without completing
      // the invite.
      const currentUser = auth.currentUser;
      let user: User;
      if (
        currentUser &&
        currentUser.email?.toLowerCase() === email.toLowerCase()
      ) {
        user = currentUser;
      } else {
        const created = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        user = created.user;
      }

      // The display name is cosmetic, so a failure here shouldn't fail sign-up
      try {
        await updateProfile(user, { displayName: `${firstName} ${lastName}` });
      } catch (error) {
        console.error("Could not set display name", error);
      }

      // acceptInvitation commits the profile and invite status in one
      // transaction. A failure here may have happened after that commit, so
      // preserve the account; a retry reuses it above instead of starting over.
      await acceptInvitation.mutateAsync({
        token,
        firstName,
        lastName,
        volunteerTypes,
      });

      return user;
    },
  });
}
