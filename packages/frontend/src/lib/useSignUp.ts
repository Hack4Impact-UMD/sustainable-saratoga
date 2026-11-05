import { useMutation } from "@tanstack/react-query";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import type { SignUpInput } from "@repo/common";
import { auth } from "@frontend/lib/firebase.ts";
import { trpc } from "@frontend/lib/trpc.ts";

/**
 * Creates the Firebase account for an invited volunteer, then their profile.
 * @returns A TanStack Query mutation for starting sign-up and tracking its
 * loading, success, and error states.
 */
export function useSignUp() {
  const createProfile = useMutation(trpc.users.create.mutationOptions());

  return useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
      volunteerTypes,
    }: SignUpInput) => {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // The display name is cosmetic, so a failure here shouldn't fail sign-up
      try {
        await updateProfile(user, { displayName: `${firstName} ${lastName}` });
      } catch (error) {
        console.error("Could not set display name", error);
      }

      // users.create reads the new user's ID token, which the tRPC client
      // picks up from auth.currentUser
      await createProfile.mutateAsync({ firstName, lastName, volunteerTypes });

      return user;
    },
  });
}
