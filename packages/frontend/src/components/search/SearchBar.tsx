import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@frontend/components/ui/button.tsx";
import { Input } from "@frontend/components/ui/input.tsx";

type SearchBarProps = {
  query: string;
  activeFilterCount: number;
  onQueryChange: (query: string) => void;
  onFilterClick: () => void;
};

export function SearchBar({
  query,
  activeFilterCount,
  onQueryChange,
  onFilterClick,
}: SearchBarProps) {
  return (
    <div className="relative w-full">
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
        className="type-body h-10 rounded-pill border-line-subtle bg-surface pr-22 pl-9 text-body shadow-1 placeholder:text-body-muted focus-visible:border-primary focus-visible:shadow-field-focus focus-visible:ring-0"
      />

      {/* Positioned as a group so the buttons' pressed nudge doesn't fight the centring. */}
      <div className="absolute inset-y-0 right-4 flex items-center">
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
          aria-label={`Filters${
            activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""
          }`}
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
  );
}
