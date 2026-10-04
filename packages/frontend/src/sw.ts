/// <reference lib="webworker" />
import { Queue } from "workbox-background-sync";
import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import type { PrecacheEntry } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { MUTATION_QUEUE_NAME } from "@frontend/lib/offlineSync.ts";
import type { SyncCommand, SyncMessage } from "@frontend/lib/offlineSync.ts";
import {
  createReplayer,
  handleMutation,
  isMutationRequest,
} from "@frontend/sw/mutationQueue.ts";
import { openAuthSession } from "@frontend/sw/session.ts";

/**
 * The service worker, built by vite-plugin-pwa (`strategies: "injectManifest"`
 * in vite.config.ts). It caches the app shell, caches Storage images, and
 * queues tRPC writes made offline (see src/sw/mutationQueue.ts).
 */

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (PrecacheEntry | string)[];
};

// App shell: every built asset, with any page load answered by index.html.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
// In dev the manifest is empty, so index.html is not precached and this would
// throw on startup. Vite serves every page itself there anyway.
if (!import.meta.env.DEV) {
  registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));
}

registerRoute(
  /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: "firebase-storage-images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  }),
  "GET",
);

// Writes made offline.
async function notify(message: SyncMessage) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clients) client.postMessage(message);
}

const send = (request: Request) => fetch(request);

// Must exist before the Queue: in browsers without Background Sync, the
// constructor replays straight away, once per service worker startup.
const replay = createReplayer({
  fetch: send,
  notify,
  // Reads the session the page saved, so tokens can be refreshed with no
  // page open.
  openSession: openAuthSession,
});

const queue = new Queue(MUTATION_QUEUE_NAME, {
  // Minutes. Field crews may be out of signal for a few days at a time.
  maxRetentionTime: 7 * 24 * 60,
  onSync: ({ queue }) => replay(queue),
});

registerRoute(
  ({ url, request }) => isMutationRequest(url, request, self.location.origin),
  ({ request }) => handleMutation(request, queue, { fetch: send, notify }),
  "POST",
);

self.addEventListener("message", (event) => {
  const data = event.data as SyncCommand | { type: "SKIP_WAITING" } | null;
  switch (data?.type) {
    // Sent by UpdatePrompt when the user accepts a new version.
    case "SKIP_WAITING":
      void self.skipWaiting();
      break;
    case "replay-queue":
      event.waitUntil(replayFromPage());
      break;
  }
});

async function replayFromPage() {
  try {
    await replay(queue);
  } catch {
    // The writes stay queued for the next sync event or page message.
  }
}
