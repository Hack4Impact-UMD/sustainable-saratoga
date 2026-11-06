import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { FilterSheet } from "@frontend/components/filters/FilterSheet.tsx";
import {
  DEFAULT_FILTERS,
  type Filters,
} from "@frontend/lib/filters.ts";
import { SearchBar } from "@frontend/components/search/SearchBar";
import type { TreeStatus } from "@repo/common";


export const Route = createFileRoute("/")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthed) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: Home,
});

const STATUS_LABEL: Record<TreeStatus, string> = {
  requested: "Requested",
  possible: "Possible",
  approved: "Approved",
  planted: "Planted",
};

/** Landing page. Placeholder until the designs are built. */
function Home() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [appliedFilters, setAppliedFilters] =
    useState<Filters>(DEFAULT_FILTERS);

  const activeFilters = [
  ...appliedFilters.years.map((year) => ({
    id: `year-${year}`,
    label: String(year),
  })),
  ...appliedFilters.statuses.map((status) => ({
    id: `status-${status}`,
    label: STATUS_LABEL[status],
  })),
];

  function removeFilter(id: string) {
  if (id.startsWith("year-")) {
    const year = Number(id.replace("year-", ""));

    setAppliedFilters((current) => ({
      ...current,
      years: current.years.filter((y) => y !== year),
    }));

    return;
  }

  const status = id.replace("status-", "") as TreeStatus;

  setAppliedFilters((current) => ({
    ...current,
    statuses: current.statuses.filter((s) => s !== status),
  }));
}

  return (
    <>
      <div className="absolute left-20 right-4 top-4 z-50">
        <SearchBar
          query={query}
          activeFilterCount={activeFilters.length}
          activeFilters={activeFilters}
          onQueryChange={setQuery}
          onFilterClick={() => setIsFilterOpen(true)}
          onRemoveFilter={removeFilter}
        />
      </div>

      <FilterSheet
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        applied={appliedFilters}
        onApply={setAppliedFilters}
      />
    </>
  );
}
