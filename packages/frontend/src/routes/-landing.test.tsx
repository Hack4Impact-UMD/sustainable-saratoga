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
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { mockMapMarkers } from "@backend/services/mockMapMarkers.ts";
import { routeTree } from "@frontend/routeTree.gen.ts";
import { trpc } from "@frontend/lib/trpc.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("keeps map pins and rows in the same activity while toggling the sheet", async () => {
  vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const pruning = mockMapMarkers.slice(0, 1).map((marker) => ({
    ...marker,
    id: "pruning-1",
    recordType: "pruning" as const,
  }));
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });
  client.setQueryData(trpc.map.markers.queryOptions({}).queryKey, [
    ...mockMapMarkers,
    ...pruning,
  ]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    context: { auth: { isAuthed: true, isPending: false, user: null } },
  });
  await act(() => router.load());
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const picker = await screen.findByRole("combobox", { name: "Record type" });
  const pins = within(screen.getByTestId("map-stub"));
  expect(
    pins.queryByRole("button", { name: "pruning-1" }),
  ).not.toBeInTheDocument();
  expect(pins.getByRole("button", { name: "maple-ln" })).toBeInTheDocument();

  fireEvent.change(picker, { target: { value: "pruning" } });
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({ view: "pruning" }),
  );
  expect(
    pins.queryByRole("button", { name: "maple-ln" }),
  ).not.toBeInTheDocument();
  expect(pins.getByRole("button", { name: "pruning-1" })).toBeInTheDocument();
  expect(
    screen.getAllByRole("button", { name: /12 Maple Hollow Ln/ }),
  ).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: /Expand list/ }));
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({
      view: "pruning",
      sheet: "expanded",
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Show map" }));
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({
      view: "pruning",
      sheet: "partial",
    }),
  );
  expect(
    within(screen.getByTestId("map-stub")).getByRole("button", {
      name: "pruning-1",
    }),
  ).toBeInTheDocument();
});
