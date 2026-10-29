import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
} from "firebase/auth";
import type { UserCredential } from "firebase/auth";
import type * as FirebaseAuth from "firebase/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@frontend/lib/useAuth.ts";
import type { AuthState } from "@frontend/lib/useAuth.ts";
import { routeTree } from "@frontend/routeTree.gen.ts";

vi.mock("@frontend/lib/firebase.ts", () => ({ auth: {} }));
vi.mock("firebase/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof FirebaseAuth>()),
  signInWithEmailAndPassword: vi.fn<typeof signInWithEmailAndPassword>(),
  verifyPasswordResetCode: vi.fn<typeof verifyPasswordResetCode>(),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("login navigation", () => {
  it.each(["mutation", "auth"] as const)(
    "waits for both authentication and login success when %s finishes first",
    async (first) => {
      let finishLogin!: (result: UserCredential) => void;
      vi.mocked(signInWithEmailAndPassword).mockImplementation(
        () => new Promise((resolve) => (finishLogin = resolve)),
      );
      const history = createMemoryHistory({
        initialEntries: ["/login?redirect=%2Fdashboard%3Fyear%3D2026%23trees"],
      });
      const authState: AuthState = {
        isPending: false,
        isAuthed: false,
        user: null,
      };
      const router = createRouter({
        routeTree,
        history,
        context: { auth: authState },
      });
      const queryClient = new QueryClient();
      function tree(isAuthed: boolean) {
        const auth = { ...authState, isAuthed };
        return (
          <QueryClientProvider client={queryClient}>
            <AuthContext.Provider value={auth}>
              <RouterProvider router={router} context={{ auth }} />
            </AuthContext.Provider>
          </QueryClientProvider>
        );
      }
      const { rerender } = render(tree(false));
      await screen.findByRole("heading", { name: "Sign in" });
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "person@example.org" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "a-long-password" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      await waitFor(() =>
        expect(signInWithEmailAndPassword).toHaveBeenCalledOnce(),
      );

      if (first === "mutation") {
        await act(() => finishLogin({} as UserCredential));
      } else {
        rerender(tree(true));
      }
      expect(history.location.pathname).toBe("/login");
      expect(
        screen.getByRole("button", { name: "Signing in..." }),
      ).toBeDisabled();

      if (first === "mutation") {
        rerender(tree(true));
      } else {
        await act(() => finishLogin({} as UserCredential));
      }
      await waitFor(() =>
        expect(router.state.location.href).toBe("/dashboard?year=2026#trees"),
      );
      expect(router.state.matches.map((match) => match.routeId)).toContain(
        "/_authenticated/dashboard",
      );
      queryClient.clear();
    },
  );
});

it("allows an authenticated user to open a reset link", async () => {
  vi.mocked(verifyPasswordResetCode).mockResolvedValue("person@example.org");
  const auth: AuthState = { isPending: false, isAuthed: true, user: null };
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ["/reset-password?oobCode=reset-code"],
    }),
    context: { auth },
  });
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <RouterProvider router={router} context={{ auth }} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  expect(await screen.findByLabelText("New password")).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/reset-password");
  expect(router.state.matches.map((match) => match.routeId)).not.toContain(
    "/_guest",
  );
  queryClient.clear();
});
