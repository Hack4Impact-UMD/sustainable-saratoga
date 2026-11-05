import type { MapMarker } from "@repo/common";
import { describe, expect, it } from "vitest";
import { findSelectedMarker, validateSearch } from "@frontend/routes/index.tsx";

const base = {
  address: "1 Broadway",
  treeNumber: 1,
  treeCount: 1,
  recordType: "planting",
  seasonYear: 2026,
  issuedBy: "Sustainable Saratoga",
} satisfies Partial<MapMarker>;

const markers: MapMarker[] = [
  { ...base, id: "tree-1", lat: 43.08, lng: -73.78, status: "planted" },
  { ...base, id: "tree-2", lat: 43.09, lng: -73.79, status: "requested" },
];

describe("home map route selection", () => {
  it("accepts a non-empty record search parameter", () => {
    expect(validateSearch({ record: "tree-1" })).toEqual({
      record: "tree-1",
    });
  });

  it.each([{}, { record: "" }, { record: 123 }, { record: null }])(
    "drops an invalid record search value: %j",
    (search) => {
      expect(validateSearch(search)).toEqual({});
    },
  );

  it("finds the marker selected by the record search parameter", () => {
    expect(findSelectedMarker(markers, "tree-2")).toEqual(markers[1]);
  });

  it("returns no marker for an unknown record", () => {
    expect(findSelectedMarker(markers, "missing")).toBeUndefined();
  });
});
