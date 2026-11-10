import type { MapMarker } from "@repo/common";
import { TreeRow } from "./TreeRow.tsx";

interface TreeListProps {
  markers: MapMarker[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedId?: string;
  view: "planting" | "pruning";
  expanded: boolean;
  onViewChange: (view: "planting" | "pruning") => void;
  onExpandedChange: (expanded: boolean) => void;
}

export function TreeList({
  markers,
  isLoading,
  isError,
  selectedId,
  view,
  expanded,
  onViewChange,
  onExpandedChange,
}: TreeListProps) {
  const filtered = markers?.filter((m) => m.recordType === view) ?? [];

  return (
    <div
      className={`flex flex-col bg-surface border-t border-line-subtle${expanded ? " h-full" : ""}`}
    >
      {/* Drag handle */}
      <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-line-subtle" />

      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-2">
        <select
          value={view}
          onChange={(e) =>
            onViewChange(e.target.value as "planting" | "pruning")
          }
          className="type-body-strong border-none bg-transparent"
          aria-label="Record type"
        >
          <option value="planting">Planting</option>
          <option value="pruning">Pruning</option>
        </select>

        <span className="type-body-sm text-secondary flex-1 text-center">
          {isLoading || isError ? "" : `${filtered.length} records`}
        </span>

        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          className="type-body-sm text-primary"
        >
          {expanded ? "Show map" : "≡ Expand list"}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="px-4 py-8 text-center type-body-sm text-secondary">
          Loading...
        </p>
      ) : isError ? (
        <p className="px-4 py-8 text-center type-body-sm text-error">
          The records couldn&apos;t load.
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <p className="type-body-strong">No records match</p>
          <p className="type-body-sm text-secondary">
            Nothing matches the search and filters together.
          </p>
          <button
            type="button"
            onClick={() => onViewChange("planting")}
            className="type-body-sm text-primary mt-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="overflow-y-auto flex-1" role="list">
          {filtered.map((marker) => (
            <li key={marker.id}>
              <TreeRow marker={marker} selectedId={selectedId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
