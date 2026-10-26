import { useMutation } from "@tanstack/react-query";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import type { SignUpInput } from "@repo/common";
import { auth } from "@frontend/lib/firebase.ts";

export function useSignUp() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
      firstName,
      lastName,
    }: SignUpInput) => {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      try {
        await updateProfile(user, { displayName: `${firstName} ${lastName}` });
      } catch (error) {
        console.error("Could not set display name", error);
      }

      // TODO: Call users.create once the endpoint is available.

      return user;
    },
  });
}
