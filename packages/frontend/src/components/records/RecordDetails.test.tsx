import { sampleRecordIds } from "@repo/common";
import type { TreeRecord } from "@repo/common";
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
  "Contacts",
  "Site assessment",
  "Planting preparation",
  "Tree details",
  "Photos",
  "Event & planting details",
  "Record information",
];

function requireRecord(id: string) {
  const record = getSampleRecord(id);
  if (!record) throw new Error(`Missing ${id}`);
  return record;
}

async function renderRecord(id: string, override?: TreeRecord) {
  const record = override ?? requireRecord(id);
  const rootRoute = createRootRoute({
    component: () => <RecordDetails record={record} />,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const mapRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/records/$recordId/map",
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, mapRoute]),
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

  it("opens Location by default and links its map preview to the full map", async () => {
    await renderRecord("maple-ln");
    expect(screen.getByRole("button", { name: "Location" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: "Open full map" })).toHaveAttribute(
      "href",
      "/records/maple-ln/map",
    );
  });

  it("shows the species number when species is missing and the address is shared", async () => {
    const record = { ...requireRecord("maple-ln"), species: null };
    await renderRecord("maple-ln", record);
    expect(
      screen.getByText("Species not recorded · Tree #2"),
    ).toBeInTheDocument();
  });

  it("dates the header by the latest photo, else the created date", async () => {
    await renderRecord("maple-ln");
    expect(screen.getAllByText("Sep 14, 2026").length).toBeGreaterThan(0);
    cleanup();
    const record = {
      ...requireRecord("maple-ln"),
      photos: [],
      recordInformation: {
        ...requireRecord("maple-ln").recordInformation,
        createdAt: "2026-03-09",
      },
    };
    await renderRecord("maple-ln", record);
    expect(screen.getByText("Mar 9, 2026")).toBeInTheDocument();
  });

  it("links email and phone", async () => {
    await renderRecord("maple-ln");
    fireEvent.click(screen.getByRole("button", { name: "Contacts" }));
    expect(
      screen.getByRole("link", { name: "mdelgado@example.org" }),
    ).toHaveAttribute("href", "mailto:mdelgado@example.org");
    expect(
      screen.getByRole("link", { name: "(518) 555-0142" }),
    ).toHaveAttribute("href", "tel:5185550142");
  });

  it("shows a placeholder for empty values", async () => {
    await renderRecord("maple-ln");
    fireEvent.click(
      screen.getByRole("button", { name: "Planting preparation" }),
    );
    expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(0);
  });
});
