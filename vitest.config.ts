import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Mirrors the `paths` map in tsconfig.base.json. */
const alias = {
  "@common": fileURLToPath(new URL("./packages/common/src", import.meta.url)),
  "@backend": fileURLToPath(new URL("./packages/backend/src", import.meta.url)),
  "@frontend": fileURLToPath(
    new URL("./packages/frontend/src", import.meta.url),
  ),
};

/**
 * One runner for the whole workspace: `pnpm test` covers every package.
 * Vitest 4 replaces `vitest.workspace.ts` with `test.projects`.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "common",
          root: "packages/common",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "backend",
          root: "packages/backend",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        resolve: {
          alias: {
            ...alias,
            // Virtual module from vite-plugin-pwa, which only exists inside the
            // Vite build. Tests mock it with `vi.mock`.
            "virtual:pwa-register/react": fileURLToPath(
              new URL(
                "./packages/frontend/src/test/pwa-register-stub.ts",
                import.meta.url,
              ),
            ),
          },
        },
        test: {
          name: "frontend",
          root: "packages/frontend",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/test-setup.ts"],
        },
      },
    ],
  },
});
