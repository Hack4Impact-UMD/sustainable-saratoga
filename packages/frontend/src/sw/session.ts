import { deleteApp, initializeApp } from "firebase/app";
import { indexedDBLocalPersistence, initializeAuth } from "firebase/auth";
import {
  firebaseOptions,
  connectAuthEmulatorInDev,
} from "@frontend/lib/firebaseConfig.ts";
import type { AuthSession } from "@frontend/sw/mutationQueue.ts";

/**
 * Reads the signed-in user that the page saved to IndexedDB, through a Firebase
 * app made for this one replay run.
 *
 * Not a long-lived Auth instance: one in the service worker only hears about
 * sign-ins and sign-outs made in pages it already controls, so it can miss
 * them (seen in testing) and send queued writes with a signed-out user's
 * token. A fresh instance always reads what is saved now. It must be the
 * default app, because Firebase keys the saved session by app name.
 */
export async function openAuthSession(): Promise<AuthSession> {
  const app = initializeApp(firebaseOptions);
  try {
    const auth = initializeAuth(app, {
      persistence: indexedDBLocalPersistence,
    });
    connectAuthEmulatorInDev(auth);
    await auth.authStateReady();
    return { user: auth.currentUser, close: () => deleteApp(app) };
  } catch (error) {
    await deleteApp(app);
    throw error;
  }
}
