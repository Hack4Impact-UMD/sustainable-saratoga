export const PROJECT_ID = "demo-vtf-template";
export const REGION = "us-central1";
export const AUTH_HOST = "http://127.0.0.1:9099";
export const FIRESTORE_HOST = "http://127.0.0.1:8080";
export const FUNCTIONS_HOST = "http://127.0.0.1:5001";

export const TEST_USER = {
  email: "e2e@example.com",
  password: "password123",
};

/** Resolves once an emulator answers, so setup never races the boot. */
export async function waitForEmulator(url: string, timeoutMs = 180_000) {
  await poll(
    async () => {
      await fetch(url);
      return true;
    },
    timeoutMs,
    `Emulator at ${url} did not start`,
  );
}

/**
 * The first call into the Functions emulator pays a container cold start of
 * several seconds. Paying it here keeps that latency out of the tests.
 */
export async function warmFunction(timeoutMs = 180_000) {
  const url = `${FUNCTIONS_HOST}/${PROJECT_ID}/${REGION}/api/api/health`;
  await poll(
    async () => {
      const response = await fetch(url);
      return response.ok;
    },
    timeoutMs,
    `Function at ${url} did not become ready`,
  );
}

/** Clears users and documents so each run starts from a known state. */
export async function resetEmulators() {
  await fetch(`${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
    method: "DELETE",
  });
  await fetch(
    `${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

async function poll(
  attempt: () => Promise<boolean>,
  timeoutMs: number,
  message: string,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      if (await attempt()) return;
    } catch {
      // The emulator is not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`${message} within ${timeoutMs}ms`);
}
