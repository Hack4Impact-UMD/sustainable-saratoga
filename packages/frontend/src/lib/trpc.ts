import type { AppRouter } from "@repo/backend";
import { QueryClient } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  splitLink,
} from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { auth } from "@frontend/lib/firebase.ts";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: {
      // By default TanStack Query holds mutations in memory while the browser
      // reports being offline, so they never reach the service worker's queue
      // and are lost if the app is closed. With a service worker in control,
      // send them anyway and let it queue them (see src/sw/mutationQueue.ts).
      networkMode: hasServiceWorker() ? "always" : "online",
    },
  },
});

// Relative on purpose: the Vite proxy handles it in development and a
// Hosting rewrite handles it in production.
const url = "/api/trpc";

async function headers() {
  const token = await auth.currentUser?.getIdToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

const client = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      // One request per mutation, so a write made offline is queued and
      // replayed on its own rather than as part of a batch.
      condition: (op) => op.type === "mutation",
      true: httpLink({ url, headers }),
      false: httpBatchLink({ url, headers }),
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({ client, queryClient });

function hasServiceWorker() {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    navigator.serviceWorker.controller !== null
  );
}
