import { defineConfig, devices } from "@playwright/test";

const devServerPort = 5173;
const baseURL = `http://127.0.0.1:${devServerPort}`;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  // Boots Vite, the esbuild watcher, and the emulators. Running `pnpm dev`
  // in another terminal first is also fine outside CI.
  webServer: {
    // Not `pnpm dev` directly: the wrapper owns the process group so the
    // emulators are always torn down, however this run ends.
    command: "node e2e/dev-server.mjs",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    // Lets the wrapper sweep this port too if Vite ever outlives its parent.
    env: { E2E_DEV_SERVER_PORT: String(devServerPort) },
    // Playwright SIGKILLs the web server by default, which would strand the
    // emulators on their ports. Give the wrapper a signal it can act on.
    gracefulShutdown: { signal: "SIGTERM", timeout: 30_000 },
  },
});
