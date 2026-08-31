import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectId = process.env.VITE_FIREBASE_PROJECT_ID ?? "demo-vtf-template";
const region = process.env.VITE_FUNCTIONS_REGION ?? "us-central1";
const functionsPort = process.env.FUNCTIONS_EMULATOR_PORT ?? "5001";

/**
 * The app always calls the relative path `/api/trpc`.
 *
 * In production Hosting rewrites `/api/**` to the `api` function, which
 * receives the path unchanged. In development this proxy points at the
 * emulator's `/<project>/<region>/api` prefix; Vite appends the matched path
 * and the emulator strips its own prefix, so Express again sees
 * `/api/trpc/...`. No environment check is needed in the tRPC client.
 */
export default defineConfig({
  plugins: [
    // Must come before the React plugin. It writes src/routeTree.gen.ts
    // from the files in src/routes.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    // Mirrors the `paths` map in tsconfig.base.json, which is what the
    // editor and oxlint follow. Keep the two in step.
    alias: {
      "@frontend": fileURLToPath(new URL("./src", import.meta.url)),
      "@common": fileURLToPath(new URL("../common/src", import.meta.url)),
      "@backend": fileURLToPath(new URL("../backend/src", import.meta.url)),
    },
  },
  server: {
    // Bind IPv4 explicitly: the emulators and the tests all use 127.0.0.1,
    // and Vite would otherwise listen on ::1 only.
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${functionsPort}/${projectId}/${region}/api`,
        changeOrigin: true,
      },
    },
  },
});
