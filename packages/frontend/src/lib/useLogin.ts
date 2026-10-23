import { useMutation } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@frontend/lib/firebase.ts";

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Signs a user in with Firebase using their email and password.
 * @returns A TanStack Query mutation for starting the sign-in request and
 * tracking its loading, success, and error states.
 */
export function useLogin(): UseMutationResult<void, Error, LoginInput> {
  return useMutation<void, Error, LoginInput>({
    mutationFn: async ({ email, password }) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
  });
}