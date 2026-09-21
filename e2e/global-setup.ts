import {
  AUTH_HOST,
  FIRESTORE_HOST,
  resetEmulators,
  waitForEmulator,
  warmFunction,
} from "@e2e/emulator.ts";

/**
 * Runs once before the suite. Playwright starts `pnpm dev` first, so the
 * emulators may still be booting when this begins.
 */
export default async function globalSetup() {
  await waitForEmulator(AUTH_HOST);
  await waitForEmulator(FIRESTORE_HOST);
  await resetEmulators();
  await warmFunction();
}
