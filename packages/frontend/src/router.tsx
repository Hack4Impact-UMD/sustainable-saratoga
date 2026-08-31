import { createRouter } from "@tanstack/react-router";
import { routeTree } from "@frontend/routeTree.gen.ts";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
