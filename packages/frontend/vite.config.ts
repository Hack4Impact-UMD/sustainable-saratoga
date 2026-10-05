import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

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
    // The service worker is our own src/sw.ts: it precaches the app shell,
    // caches Storage images, and queues writes made offline with Workbox
    // Background Sync. Offline reads and map tiles are not handled yet.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      // A new version waits until the user accepts the prompt in UpdatePrompt,
      // so a deploy never reloads the page while a volunteer is mid-form.
      registerType: "prompt",
      devOptions: {
        // Off by default so the dev server never serves stale pages. Run
        // `PWA_DEV=true pnpm dev` to test service worker behavior locally.
        enabled: process.env.PWA_DEV === "true",
        // Vite serves src/sw.ts unbundled in dev, as an ES module.
        type: "module",
      },
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Sustainable Saratoga Tree Tracker",
        short_name: "Tree Tracker",
        description:
          "Mobile-friendly tree tracking for Sustainable Saratoga fieldwork.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
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
