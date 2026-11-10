import type { MapMarker } from "@repo/common";
import { Plus } from "lucide-react";
import { useRef } from "react";
import type { PointerEvent } from "react";
import { TreeRow } from "./TreeRow.tsx";

export type SheetState = "collapsed" | "partial" | "expanded";

interface TreeListProps {
  markers: MapMarker[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selectedId?: string;
  view: "planting" | "pruning";
  sheet: SheetState;
  onViewChange: (view: "planting" | "pruning") => void;
  onSheetChange: (sheet: SheetState) => void;
}

export function TreeList({
  markers,
  isLoading,
  isError,
  selectedId,
  view,
  sheet,
  onViewChange,
  onSheetChange,
}: TreeListProps) {
  const filtered = markers?.filter((m) => m.recordType === view) ?? [];

  // Drag-to-snap: track the Y position where the drag started.
  const dragStartY = useRef<number | null>(null);

  function handleDragStart(e: PointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragEnd(e: PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    const delta = dragStartY.current - e.clientY; // positive = dragged up
    dragStartY.current = null;

    if (sheet === "collapsed" && delta > 40) onSheetChange("partial");
    else if (sheet === "partial" && delta > 40) onSheetChange("expanded");
    else if (sheet === "partial" && delta < -40) onSheetChange("collapsed");
    else if (sheet === "expanded" && delta < -40) onSheetChange("partial");
  }

  // Tap the handle to cycle: collapsed → partial → expanded → partial → …
  function handleHandleTap() {
    if (sheet === "collapsed") onSheetChange("partial");
    else if (sheet === "partial") onSheetChange("expanded");
    else onSheetChange("partial");
  }

  const isExpanded = sheet === "expanded";
  const isCollapsed = sheet === "collapsed";

  return (
    <div
      className={`flex flex-col bg-surface border-t border-line-subtle${isExpanded ? " flex-1 min-h-0" : ""}`}
    >
      {/* Drag handle */}
      <div
        className="mx-auto mt-2 mb-1 h-1 w-10 cursor-row-resize rounded-full bg-line-subtle touch-none"
        role="button"
        aria-label="Resize sheet"
        tabIndex={0}
        onPointerDown={handleDragStart}
        onPointerUp={handleDragEnd}
        onPointerCancel={() => {
          dragStartY.current = null;
        }}
        onClick={handleHandleTap}
      />

      {/* Header row — always visible */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* "Planting ∨" — h3 weight matches Figma */}
        <select
          value={view}
          onChange={(e) =>
            onViewChange(e.target.value as "planting" | "pruning")
          }
          className="type-h2 border-none bg-transparent p-0 text-heading"
          aria-label="Record type"
        >
          <option value="planting">Planting</option>
          <option value="pruning">Pruning</option>
        </select>

        <span className="type-supporting flex-1 text-center">
          {!isLoading && !isError ? `${filtered.length} records` : ""}
        </span>

        <button
          type="button"
          onClick={() =>
            onSheetChange(
              isExpanded ? "partial" : isCollapsed ? "partial" : "expanded",
            )
          }
          className="type-control flex items-center gap-1.5 rounded-pill border border-line-strong px-3 py-1"
        >
          {isExpanded ? (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="3"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M1 6h14" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Show map
            </>
          ) : (
            "≡ Expand list"
          )}
        </button>
      </div>

      {/* List content — hidden when collapsed */}
      {!isCollapsed && (
        <>
          {isLoading ? (
            <p className="type-body-sm px-4 py-8 text-center text-body-muted">
              Loading...
            </p>
          ) : isError ? (
            <p className="type-body-sm px-4 py-8 text-center text-error">
              The records couldn&apos;t load.
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <p className="type-body-strong">No records match</p>
              <p className="type-body-sm text-body-muted">
                Nothing matches the search and filters together.
              </p>
              <button
                type="button"
                onClick={() => onViewChange("planting")}
                className="type-link mt-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto" role="list">
              {filtered.map((marker) => (
                <li key={marker.id}>
                  <TreeRow marker={marker} selectedId={selectedId} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Add record — layout stub; full action is the TL's responsibility */}
      <div
        className={`px-4 pb-4 pt-2${isCollapsed ? " border-t border-line-subtle" : ""}`}
      >
        <button
          type="button"
          disabled
          className="flex h-control w-full items-center justify-center gap-2 rounded-pill border-2 border-primary bg-surface type-btn-secondary disabled:cursor-default"
          aria-label="Add record"
        >
          <Plus size={20} aria-hidden="true" />
          Add record
        </button>
      </div>
    </div>
  );
}
