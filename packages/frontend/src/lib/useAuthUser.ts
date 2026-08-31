import { useQueryClient } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@frontend/lib/firebase.ts";

/**
 * Re-renders on every Firebase sign-in change, and refetches afterwards
 * because the ID token feeds the header of every tRPC request.
 */
export function useAuthUser(): User | null {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const queryClient = useQueryClient();

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      void queryClient.invalidateQueries();
    });
  }, [queryClient]);

  return user;
}
