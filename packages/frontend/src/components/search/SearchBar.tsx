
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
          className="h-10 w-full rounded-[9999px]! border border-line-subtle! bg-surface! pl-9 pr-20 text-lg text-[#555555] shadow-1 placeholder:text-[#A3A3A1] focus-visible:ring-2 focus-visible:ring-[#c8d8cd]"
        />

        <div className="absolute inset-y-0 right-2 z-10 flex items-center gap-1">
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
            size="sm"
            onClick={onFilterClick}
            aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
            className="relative size-10 rounded-full text-[#929292] hover:bg-[#eaeae7]"
          >
            <SlidersHorizontal className="size-6" />

            {activeFilterCount > 0 && (
              <span
                style={{
                  backgroundColor: "rgb(46, 97, 59)",
                  color: "#FFFFFF",
                }}
                className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium"
              >
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
              className="inline-flex items-center gap-2 rounded-full border border-line-subtle bg-surface px-3 py-1 text-sm text-[#A3A3A1] shadow-sm hover:bg-[#eaeae7]"
              aria-label={`Remove ${filter.label} filter`}
            >
              {filter.label}
              <X aria-hidden="true" className="size-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
