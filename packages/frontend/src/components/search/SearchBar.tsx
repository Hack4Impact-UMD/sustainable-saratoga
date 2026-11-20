import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@frontend/components/ui/button.tsx";
import { Input } from "@frontend/components/ui/input.tsx";

type SearchBarProps = {
  query: string;
  activeFilterCount: number;
  onQueryChange: (query: string) => void;
  onFilterClick: () => void;
  activeFilters: { id: string; label: string }[];
  onRemoveFilter: (id: string) => void;
};

export function SearchBar({
  query,
  activeFilterCount,
  onQueryChange,
  onFilterClick,
  activeFilters,
  onRemoveFilter,
}: SearchBarProps) {
  return (
    <div className="w-full">
      <div className="relative h-10 w-full">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 z-10 size-4 -translate-y-1/2 text-icon-primary"
        />

        <Input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search address or name"
          aria-label="Search trees"
          // Leave room for the filter button, plus the clear button once there's text.
          className={`type-body h-10 w-full rounded-pill border-line-subtle bg-surface pl-9 text-body shadow-1 placeholder:text-body-muted focus-visible:border-primary focus-visible:shadow-field-focus focus-visible:ring-0 ${query ? "pr-22" : "pr-14"}`}
        />

        {/* Positioned as a group so the buttons' pressed nudge doesn't fight the centring. */}
        <div className="absolute inset-y-0 right-4 z-10 flex items-center">
          {query.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear search"
              onClick={() => onQueryChange("")}
            >
              <X />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onFilterClick}
            aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
            className="relative size-10"
          >
            <SlidersHorizontal className="size-6" />

            {activeFilterCount > 0 && (
              <span className="type-badge absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-pill bg-primary text-on-primary">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Removable chips for selected filters */}
      {activeFilters.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onRemoveFilter(filter.id)}
              className="type-chip inline-flex items-center gap-1.5 rounded-pill border border-line-subtle bg-surface px-3 py-1 text-body shadow-1 hover:bg-hover"
              aria-label={`Remove ${filter.label} filter`}
            >
              {filter.label}
              <X aria-hidden="true" className="size-3.5 text-icon-primary" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
