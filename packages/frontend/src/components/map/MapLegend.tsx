import { X } from "lucide-react";
import { useState } from "react";
import type { TreeStatus } from "@repo/common";
import { StatusMarker } from "@frontend/components/status/StatusMarker.tsx";

const LEGEND_ITEMS: { status: TreeStatus; label: string }[] = [
  { status: "requested", label: "Requested" },
  { status: "possible", label: "Possible" },
  { status: "approved", label: "Approved" },
  { status: "planted", label: "Planted" },
];

/**
 * Toggles between the compact legend button and the expanded legend.
 */
export function MapLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`pointer-events-auto relative ml-[19.85px] self-end transition-[width,height] duration-150 ${
        isExpanded ? "h-49.5 w-49" : "h-10 w-19.25"
      }`}
    >
      {/* Compact legend button */}
      <div
        aria-hidden={isExpanded}
        inert={isExpanded}
        className={`absolute bottom-0 left-0 transition-opacity duration-150 ${
          isExpanded ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <button
          className="type-btn-secondary flex h-10 w-19.25 items-center justify-center rounded-(--radius-pill) border border-(--color-border) bg-(--bg-surface) shadow-1"
          type="button"
          onClick={() => setIsExpanded(true)}
        >
          Legend
        </button>
      </div>

      {/* Expanded legend with marker list */}
      <div
        aria-hidden={!isExpanded}
        inert={!isExpanded}
        className={`absolute bottom-0 left-0 transition-opacity duration-150 ${
          isExpanded ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <section
          className="flex h-49.5 w-49 justify-between rounded-(--radius-md) border border-(--color-border-subtle) bg-(--bg-surface) shadow-2"
          aria-label="Map legend"
        >
          <div className="ml-4.25 mt-[14.5px] mb-3.75">
            <h2 className="w-14 text-heading type-body-strong">Legend</h2>
            <ul>
              {LEGEND_ITEMS.map(({ status, label }) => (
                <li className="mt-2.5 flex gap-2.5" key={status}>
                  {/* Hidden from screen readers: the label beside it names the status */}
                  <span aria-hidden="true" className="flex shrink-0">
                    <StatusMarker status={status} size={24} />
                  </span>
                  <span className="text-(--color-text-muted) leading-(--type-supporting-line-height)">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <button
            className="flex w-10 h-10 justify-center items-center rounded-pill pt-1.75 pr-1.75"
            type="button"
            aria-label="Collapse legend"
            onClick={() => setIsExpanded(false)}
          >
            <X className="text-icon-primary w-5 h-5" aria-hidden="true" />
          </button>
        </section>
      </div>
    </div>
  );
}
