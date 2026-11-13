import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { useGoogleSignUp } from "@frontend/lib/useGoogleAuth.ts";

const state = vi.hoisted(() => ({
  accept: vi.fn<() => Promise<{ status: "accepted" | "restoring" }>>(),
  signIn:
    vi.fn<() => Promise<{ user: { email: string; delete: () => void } }>>(),
  signOut: vi.fn<() => Promise<void>>(),
  deleteUser: vi.fn<() => void>(),
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  getAdditionalUserInfo: () => ({ isNewUser: true }),
  signInWithPopup: state.signIn,
  signOut: state.signOut,
}));
vi.mock("@frontend/lib/firebase.ts", () => ({ auth: {} }));
vi.mock("@frontend/lib/trpc.ts", () => ({
  queryClient: {
    cancelQueries: () => Promise.resolve(),
    removeQueries: () => {},
  },
  trpc: {
    invites: {
      accept: { mutationOptions: () => ({ mutationFn: state.accept }) },
    },
    users: { create: { mutationOptions: () => ({}) } },
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  state.signIn.mockResolvedValue({
    user: { email: "invited@example.org", delete: state.deleteUser },
  });
});

it("signs out after uncertain invite acceptance while preserving the Firebase account", async () => {
  state.accept.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  const client = new QueryClient();
  const { result } = renderHook(useGoogleSignUp, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  await act(async () => {
    await expect(
      result.current.mutateAsync({
        token: "invite-token",
        email: "invited@example.org",
        firstName: "Ada",
        lastName: "Example",
        volunteerTypes: ["planter"],
      }),
    ).rejects.toThrow("Failed to fetch");
  });
  expect(state.signOut).toHaveBeenCalledTimes(1);
  expect(state.deleteUser).not.toHaveBeenCalled();
});
