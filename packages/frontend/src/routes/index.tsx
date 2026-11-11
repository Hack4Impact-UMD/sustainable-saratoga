import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { FilterSheet } from "@frontend/components/filters/FilterSheet.tsx";
import { DEFAULT_FILTERS, countActiveFilters } from "@frontend/lib/filters.ts";
import { SearchBar } from "@frontend/components/search/SearchBar.tsx";

export const Route = createFileRoute("/")({
  // Temporary: the landing page has no signed-out view yet, so send visitors to
  // sign in instead of showing a blank page.
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

/** Landing page. Placeholder until the designs are built. */
function Home() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Local stand-in until the filters are wired to the map and the URL.
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  // return null;
  // this is a placeholder until the search bar is built
  return (
    <>
      <div className="absolute left-20 right-4 top-4 z-50">
        <SearchBar
          query={query}
          activeFilterCount={countActiveFilters(filters)}
          onQueryChange={setQuery}
          onFilterClick={() => setIsFilterOpen(true)}
        />
      </div>

      <FilterSheet
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        applied={filters}
        onApply={setFilters}
      />
    </>
  );
}
