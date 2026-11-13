import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@frontend/routeTree.gen.ts";
import { AuthContext } from "@frontend/lib/useAuth.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";

const profileState = vi.hoisted(() => ({
  role: "admin" as "admin" | "volunteer",
  failOnce: false,
}));

vi.mock("@frontend/lib/firebase.ts", () => ({ auth: {} }));

vi.mock("@frontend/lib/trpc.ts", () => ({
  trpc: {
    invites: {
      resend: { mutationOptions: () => ({}) },
      cancel: { mutationOptions: () => ({}) },
    },
    users: {
      me: {
        queryOptions: () => ({
          queryKey: ["users", "me"],
          queryFn: () => {
            if (profileState.failOnce) {
              profileState.failOnce = false;
              return Promise.reject(new Error("Profile unavailable"));
            }
            return Promise.resolve({
              session: { uid: "current-user" },
              profile: {
                firstName: "Dana",
                lastName: "Ruiz",
                email: "dana@example.com",
                role: profileState.role,
                status: "active",
              },
            });
          },
        }),
      },
    },
    people: {
      list: {
        queryKey: () => ["people", "list"],
        queryOptions: () => ({
          queryKey: ["people", "list"],
          queryFn: () => Promise.resolve([]),
        }),
      },
      removeAccess: {
        mutationOptions: () => ({
          mutationFn: () => Promise.resolve({ uid: "unused" }),
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
    user: { uid: "current-user" } as AuthState["user"],
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
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} context={{ auth }} />
      </AuthContext.Provider>
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

  it("keeps admins on the page when loading the profile fails and allows retry", async () => {
    profileState.failOnce = true;
    const router = renderRoute("admin");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load your account",
    );
    expect(router.state.location.pathname).toBe("/people");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("heading", { name: "People & invitations" }),
    ).toBeInTheDocument();
  });

  it("redirects volunteers to the records page", async () => {
    const router = renderRoute("volunteer");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
  });
});
