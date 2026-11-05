import type { MapMarkersInput, TreeStatus } from "@repo/common";

// Order matches the Figma status list.
export const STATUSES: readonly TreeStatus[] = [
  "requested",
  "possible",
  "approved",
  "planted",
];

export type Filters = {
  q: string; // text search, runs on the client
  years: number[]; // [] = all years
  statuses: TreeStatus[]; // all four = no status filter
};

export const DEFAULT_FILTERS: Filters = {
  q: "",
  years: [],
  statuses: [...STATUSES],
};

export function allStatusesSelected(statuses: TreeStatus[]): boolean {
  return STATUSES.every((s) => statuses.includes(s));
}

/** Number on the filter button badge. Search text doesn't count. */
export function countActiveFilters(f: Filters): number {
  return (
    (f.years.length > 0 ? 1 : 0) + (allStatusesSelected(f.statuses) ? 0 : 1)
  );
}

/**
 * Input for `map.markers`. The server treats empty arrays as "no filter",
 * so "no statuses selected" must be handled by the caller (show 0 records).
 */
export function toMarkerQueryInput(f: Filters): MapMarkersInput {
  return {
    year: f.years.length > 0 ? f.years : undefined,
    status: allStatusesSelected(f.statuses) ? undefined : f.statuses,
  };
}

// ---- URL helpers: defaults are omitted, so a clean URL = no filters ----

export function parseFilters(search: Record<string, unknown>): Filters {
  // The router may hand us numbers ("?q=123", "?year=2024"), so accept both.
  const asText = (v: unknown) =>
    typeof v === "string" || typeof v === "number" ? String(v) : undefined;

  const q = asText(search.q) ?? "";

  const yearParam = asText(search.year);
  const years = (yearParam?.split(",") ?? [])
    .filter((s) => s.trim() !== "")
    .map(Number)
    .filter((n) => Number.isInteger(n));

  const statusParam = asText(search.status);
  const statuses =
    statusParam === undefined
      ? [...STATUSES]
      : STATUSES.filter((s) => statusParam.split(",").includes(s));

  return { q, years, statuses };
}

export function serializeFilters(f: Filters) {
  return {
    q: f.q.trim() || undefined,
    year:
      f.years.length > 0
        ? [...f.years].sort((a, b) => a - b).join(",")
        : undefined,
    status: allStatusesSelected(f.statuses) ? undefined : f.statuses.join(","),
  };
}