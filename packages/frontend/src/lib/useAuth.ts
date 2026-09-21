import type { User } from "firebase/auth";
import { createContext, useContext } from "react";

export interface AuthState {
  isPending: boolean;
  isAuthed: boolean;
  user: User | null;
}

export const DefaultAuthState: AuthState = {
  isPending: true,
  isAuthed: false,
  user: null,
};

export const AuthContext = createContext<AuthState>(DefaultAuthState);

export function useAuth() {
  return useContext(AuthContext);
}
