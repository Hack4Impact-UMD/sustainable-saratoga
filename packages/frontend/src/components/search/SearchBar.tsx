
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@frontend/components/ui/button.tsx";
import { Input } from "@frontend/components/ui/input";

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
        className="pointer-events-none absolute left-4 top-1/2 z-10 size-4 -translate-y-1/2 text-[#929292]"
      />

      <Input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search address or name"
        aria-label="Search trees"
        className="h-10 w-full rounded-[9999px]! border border-line-subtle! bg-surface! pl-9 pr-9 text-lg text-[#555555] shadow-1 placeholder:text-[#A3A3A1] focus-visible:ring-2 focus-visible:ring-[#c8d8cd]"
      
      />

      {query.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Clear search"
          onClick={() => onQueryChange("")}
          className="absolute right-14 top-1/2 z-10 -translate-y-1/2 rounded-full"
        >
          <X />
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onFilterClick}
        aria-label={`Filters${
          activeFilterCount > 0
            ? `, ${activeFilterCount} active`
            : ""
        }`}
        className="absolute right-4 top-1/2 z-10 size-10 -translate-y-1/2 rounded-full text-[#929292] hover:bg-[#eaeae7] active:translate-y-[-50%]! active:scale-100! active:transform-none!"
        >
        <SlidersHorizontal className="size-6" />

        {activeFilterCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {activeFilterCount}
          </span>
        )}
      </Button>
    </div>
  );
}
