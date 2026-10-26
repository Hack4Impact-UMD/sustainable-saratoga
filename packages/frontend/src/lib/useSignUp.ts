import { useMutation } from "@tanstack/react-query";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@frontend/lib/firebase.ts";

interface SignUpInput {
  email: string;
  password: string;
  name: string;
}

export function useSignUp() {
  return useMutation({
    mutationFn: async ({ email, password, name }: SignUpInput) => {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      try {
        await updateProfile(user, { displayName: name });
      } catch (error) {
        console.error("Could not set display name", error);
      }

      // TODO: Call users.create once the endpoint is available.

      return user;
    },
  });
}
