import { createRouter } from "@tanstack/react-router";
import { routeTree } from "@frontend/routeTree.gen.ts";
import { DefaultAuthState } from "@frontend/lib/useAuth.ts";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  context: {
    auth: DefaultAuthState,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
