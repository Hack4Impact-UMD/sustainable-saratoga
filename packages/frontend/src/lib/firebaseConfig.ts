import type { FirebaseOptions } from "firebase/app";
import { connectAuthEmulator } from "firebase/auth";
import type { Auth } from "firebase/auth";

/**
 * Shared by the page (`firebase.ts`) and the service worker, which creates its
 * own Firebase app. No side effects here, so either can import it.
 *
 * In development every value can stay fake: the Auth emulator accepts any
 * API key. For production, copy the real values into `.env` or set them in
 * your CI. See `.env.example`.
 */
export const firebaseOptions: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "fake-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "demo-vtf-template",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Points Auth at the emulator in development. Call before using it. */
export function connectAuthEmulatorInDev(auth: Auth) {
  if (import.meta.env.DEV) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
  }
}
