import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  countActiveFilters,
  parseFilters,
  serializeFilters,
  toMarkerQueryInput,
} from "@frontend/lib/filters.ts";

describe("filters", () => {
  it("has no active filters by default", () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    expect(toMarkerQueryInput(DEFAULT_FILTERS)).toEqual({
      year: undefined,
      status: undefined,
    });
  });

  it("counts year and status as one filter each", () => {
    expect(
      countActiveFilters({ ...DEFAULT_FILTERS, years: [2024, 2025] }),
    ).toBe(1);
    expect(
      countActiveFilters({
        ...DEFAULT_FILTERS,
        years: [2026],
        statuses: ["approved"],
      }),
    ).toBe(2);
  });

  it("builds the server query only from active filters", () => {
    expect(
      toMarkerQueryInput({
        ...DEFAULT_FILTERS,
        years: [2024],
        statuses: ["planted"],
      }),
    ).toEqual({ year: [2024], status: ["planted"] });
  });

  it("round-trips through the URL", () => {
    const f = {
      q: "oak",
      years: [2025, 2026],
      statuses: ["approved" as const, "planted" as const],
    };
    expect(parseFilters(serializeFilters(f))).toEqual(f);
  });

  it("omits defaults from the URL", () => {
    expect(serializeFilters(DEFAULT_FILTERS)).toEqual({
      q: undefined,
      year: undefined,
      status: undefined,
    });
  });

  it("ignores junk in the URL", () => {
    expect(parseFilters({ year: "abc,2024", status: "bogus,planted" })).toEqual(
      {
        q: "",
        years: [2024],
        statuses: ["planted"],
      },
    );
  });
  it("accepts numeric params from the router", () => {
    expect(parseFilters({ q: 123, year: 2024 })).toMatchObject({
      q: "123",
      years: [2024],
    });
  });
});
