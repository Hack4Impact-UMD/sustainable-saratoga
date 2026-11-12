import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@frontend/routeTree.gen.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";

const profileState = vi.hoisted(() => ({
  role: "admin" as "admin" | "volunteer",
}));

vi.mock("@frontend/lib/firebase.ts", () => ({ auth: {} }));

vi.mock("@frontend/lib/trpc.ts", () => ({
  trpc: {
    users: {
      me: {
        queryOptions: () => ({
          queryKey: ["users", "me"],
          queryFn: () =>
            Promise.resolve({
              session: { uid: "current-user" },
              profile: {
                firstName: "Dana",
                lastName: "Ruiz",
                email: "dana@example.com",
                role: profileState.role,
                status: "active",
              },
            }),
        }),
      },
    },
    people: {
      list: {
        queryOptions: () => ({
          queryKey: ["people", "list"],
          queryFn: () => Promise.resolve([]),
        }),
      },
    },
    map: {
      markers: {
        queryOptions: () => ({
          queryKey: ["map", "markers"],
          queryFn: () => Promise.resolve([]),
        }),
      },
    },
  },
}));

function renderRoute(role: "admin" | "volunteer") {
  profileState.role = role;
  const auth: AuthState = {
    isPending: false,
    isAuthed: true,
    user: null,
  };
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/people"] }),
    context: { auth },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ auth }} />
    </QueryClientProvider>,
  );

  return router;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("/people route", () => {
  it("allows admins to render the page", async () => {
    const router = renderRoute("admin");

    expect(
      await screen.findByRole("heading", {
        name: "People & invitations",
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/people");
  });

  it("redirects volunteers to the records page", async () => {
    const router = renderRoute("volunteer");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
  });
});
