import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onIdTokenChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@frontend/lib/firebase.ts";
import { AuthContext, DefaultAuthState } from "@frontend/lib/useAuth.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(DefaultAuthState);
  const queryClient = useQueryClient();

  useEffect(() => {
    return onIdTokenChanged(auth, (next) => {
      if (next) {
        setAuthState({
          user: next,
          isPending: false,
          isAuthed: true,
        });
      } else {
        setAuthState({
          user: null,
          isPending: false,
          isAuthed: false,
        });
      }
      void queryClient.invalidateQueries();
    });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}
