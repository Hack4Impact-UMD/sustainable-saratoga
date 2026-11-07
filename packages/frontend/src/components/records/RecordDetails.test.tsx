import { sampleRecordIds } from "@repo/common";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RecordDetails } from "@frontend/components/records/RecordDetails.tsx";
import { getSampleRecord } from "@frontend/lib/sampleRecords.ts";

afterEach(cleanup);

const sections = [
  "Location",
  "Site assessment",
  "Planting preparation",
  "Tree details",
  "Photos",
  "Contacts",
  "Event & planting details",
  "Record information",
];

async function renderRecord(id: string) {
  const record = getSampleRecord(id);
  if (!record) throw new Error(`Missing ${id}`);
  const rootRoute = createRootRoute({
    component: () => <RecordDetails record={record} />,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1 });
}

describe("RecordDetails", () => {
  it.each(sampleRecordIds)(
    "renders all sections in order for %s",
    async (id) => {
      await renderRecord(id);
      const headings = screen
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent);
      const count = getSampleRecord(id)?.photos.length ?? 0;
      expect(headings).toEqual(
        sections.map((title) =>
          title === "Photos" && count > 0 ? `Photos (${count})` : title,
        ),
      );
    },
  );

  it("links View on map to the record on the landing page", async () => {
    await renderRecord("maple-ln");
    fireEvent.click(screen.getByRole("button", { name: "Location" }));
    expect(screen.getByRole("link", { name: "View on map" })).toHaveAttribute(
      "href",
      "/?record=maple-ln",
    );
  });

  it("shows a placeholder for empty values", async () => {
    await renderRecord("maple-ln");
    fireEvent.click(
      screen.getByRole("button", { name: "Planting preparation" }),
    );
    expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(0);
  });
});
