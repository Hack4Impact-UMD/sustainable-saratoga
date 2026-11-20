import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onIdTokenChanged } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { auth } from "@frontend/lib/firebase.ts";
import { AuthContext, DefaultAuthState } from "@frontend/lib/useAuth.ts";
import { clearSessionQueries } from "@frontend/lib/sessionCleanup.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(DefaultAuthState);
  const queryClient = useQueryClient();
  const previousUid = useRef<string | null>(null);

  useEffect(() => {
    return onIdTokenChanged(auth, (next) => {
      const uid = next?.uid ?? null;
      if (previousUid.current !== uid) {
        clearSessionQueries(queryClient);
        previousUid.current = uid;
      }
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
