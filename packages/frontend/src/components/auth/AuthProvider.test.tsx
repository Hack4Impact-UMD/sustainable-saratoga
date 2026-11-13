import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AuthProvider } from "@frontend/components/auth/AuthProvider.tsx";
import { useAuth } from "@frontend/lib/useAuth.ts";
import type { User } from "firebase/auth";

const listener = vi.hoisted(() => ({ current: (_user: User | null) => {} }));
vi.mock("@frontend/lib/firebase.ts", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({
  onIdTokenChanged: (_auth: unknown, handler: (user: User | null) => void) => {
    listener.current = handler;
    return () => {};
  },
  signOut: vi.fn<() => Promise<void>>().mockImplementation(async () => {}),
}));
function Session() {
  const { user } = useAuth();
  return <output>{user?.uid ?? "guest"}</output>;
}
it("clears admin cache before publishing another account and retains it on same-UID refresh", () => {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Session />
      </AuthProvider>
    </QueryClientProvider>,
  );
  const admin = { uid: "admin" } as User;
  act(() => listener.current(admin));
  client.setQueryData(["users", "me"], { profile: { role: "admin" } });
  client.setQueryData(["people", "list"], [{ email: "private@example.com" }]);
  act(() => listener.current(admin));
  expect(client.getQueryData(["people", "list"])).toBeDefined();
  act(() => listener.current({ uid: "volunteer" } as User));
  expect(screen.getByText("volunteer")).toBeInTheDocument();
  expect(client.getQueryData(["users", "me"])).toBeUndefined();
  expect(client.getQueryData(["people", "list"])).toBeUndefined();
});
