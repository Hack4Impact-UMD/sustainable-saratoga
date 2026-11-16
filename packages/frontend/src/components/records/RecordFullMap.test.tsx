import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecordFullMap } from "@frontend/components/records/RecordFullMap.tsx";
import {
  getSampleRecord,
  listSampleRecords,
} from "@frontend/lib/sampleRecords.ts";
import {
  lastStubPanTo,
  resetStubCamera,
} from "@frontend/components/map/stubCamera.ts";

// Swap the Google map for the stub so the camera can be inspected.
vi.mock("@frontend/components/map/MapView.tsx", async () => ({
  MapView: (await import("@frontend/components/map/testing.ts")).MapView,
}));

afterEach(cleanup);

describe("RecordFullMap", () => {
  it("titles the page with the address, links back, and re-centers", async () => {
    const record = getSampleRecord("maple-ln");
    if (!record) throw new Error("Missing sample record");
    resetStubCamera();
    const router = createRouter({
      routeTree: createRootRoute({
        component: () => (
          <RecordFullMap record={record} others={listSampleRecords()} />
        ),
      }),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: record.address }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to record" }),
    ).toHaveAttribute("href", "/records/maple-ln");
    fireEvent.click(screen.getByRole("button", { name: "Re-center on tree" }));
    expect(lastStubPanTo()?.pos).toEqual({ lat: record.lat, lng: record.lng });
  });
});
