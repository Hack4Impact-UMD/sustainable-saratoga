import type { AppRouter } from "@repo/backend";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { auth } from "@frontend/lib/firebase.ts";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      // Relative on purpose: the Vite proxy handles it in development and a
      // Hosting rewrite handles it in production.
      url: "/api/trpc",
      async headers() {
        const token = await auth.currentUser?.getIdToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({ client, queryClient });
