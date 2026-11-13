import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import {
  clearSessionQueries,
  sessionGeneration,
  signOutAndClear,
} from "@frontend/lib/sessionCleanup.ts";

vi.mock("@frontend/lib/firebase.ts", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({
  signOut: vi.fn<() => Promise<void>>().mockImplementation(async () => {}),
}));

it("removes cached account data and ignores a late query response", async () => {
  const client = new QueryClient();
  client.setQueryData(["people"], ["private email"]);
  let finish: (value: string) => void = () => {};
  const pending = client.fetchQuery({
    queryKey: ["profile"],
    queryFn: () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  });
  const generation = sessionGeneration();
  clearSessionQueries(client);
  finish("old admin");
  await expect(pending).rejects.toBeDefined();
  expect(client.getQueryData(["people"])).toBeUndefined();
  expect(client.getQueryData(["profile"])).toBeUndefined();
  expect(sessionGeneration()).toBeGreaterThan(generation);
});

it("removes cached data before signing out", async () => {
  const client = new QueryClient();
  client.setQueryData(["people"], ["private email"]);
  await signOutAndClear(client);
  expect(client.getQueryData(["people"])).toBeUndefined();
});
