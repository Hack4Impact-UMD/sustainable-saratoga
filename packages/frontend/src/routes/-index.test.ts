import type { MapMarker } from "@repo/common";
import { describe, expect, it } from "vitest";
import { findSelectedMarker, validateSearch } from "@frontend/routes/index.tsx";
import { treeLabel } from "@frontend/components/landing/treeLabel.ts";

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
    expect(validateSearch({ record: "tree-1" })).toMatchObject({
      record: "tree-1",
    });
  });

  it.each([{}, { record: "" }, { record: 123 }, { record: null }])(
    "drops an invalid record search value: %j",
    (search) => {
      expect(validateSearch(search)).not.toHaveProperty("record");
    },
  );

  it("finds the marker selected by the record search parameter", () => {
    expect(findSelectedMarker(markers, "tree-2")).toEqual(markers[1]);
  });

  it("returns no marker for an unknown record", () => {
    expect(findSelectedMarker(markers, "missing")).toBeUndefined();
  });
});

describe("treeLabel", () => {
  it("returns just the address when treeCount is 1", () => {
    expect(
      treeLabel({
        ...base,
        id: "t",
        lat: 0,
        lng: 0,
        status: "planted",
        treeCount: 1,
        treeNumber: 1,
      }),
    ).toBe("1 Broadway");
  });
  it("includes the tree number when treeCount is greater than 1", () => {
    expect(
      treeLabel({
        ...base,
        id: "t",
        lat: 0,
        lng: 0,
        status: "planted",
        treeCount: 3,
        treeNumber: 2,
      }),
    ).toBe("1 Broadway · Tree #2");
  });
});

describe("validateSearch view param", () => {
  it("omits view when absent", () => {
    expect(validateSearch({})).not.toHaveProperty("view");
  });
  it("accepts 'planting'", () => {
    expect(validateSearch({ view: "planting" })).toMatchObject({
      view: "planting",
    });
  });
  it("accepts 'pruning'", () => {
    expect(validateSearch({ view: "pruning" })).toMatchObject({
      view: "pruning",
    });
  });
  it("drops invalid view values", () => {
    expect(validateSearch({ view: "invalid" })).not.toHaveProperty("view");
  });
});

describe("validateSearch sheet param", () => {
  it("omits sheet when absent", () => {
    expect(validateSearch({})).not.toHaveProperty("sheet");
  });
  it("accepts 'collapsed'", () => {
    expect(validateSearch({ sheet: "collapsed" })).toMatchObject({
      sheet: "collapsed",
    });
  });
  it("accepts 'expanded'", () => {
    expect(validateSearch({ sheet: "expanded" })).toMatchObject({
      sheet: "expanded",
    });
  });
  it("accepts 'partial'", () => {
    expect(validateSearch({ sheet: "partial" })).toMatchObject({
      sheet: "partial",
    });
  });
  it("drops invalid sheet values", () => {
    expect(validateSearch({ sheet: "open" })).not.toHaveProperty("sheet");
  });
});
