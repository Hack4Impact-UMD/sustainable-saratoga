import { Check, X } from "lucide-react";
import { useState } from "react";
import type { TreeStatus } from "@repo/common";

const LEGEND_ITEMS: { status: TreeStatus; label: string }[] = [
  { status: "requested", label: "Requested" },
  { status: "not_planted", label: "Possible" },
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
                  <StatusMarker status={status} />
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

function StatusMarker({ status }: { status: TreeStatus }) {
  /** Selects the glyph and accessible label for a legend status. */
  const marker = {
    requested: { glyph: "R", label: "Requested marker" },
    not_planted: { glyph: "P", label: "Possible marker" },
    approved: { glyph: "A", label: "Approved marker" },
    planted: {
      glyph: <Check className="w-3.25 h-3.25 stroke-3" />,
      label: "Planted marker",
    },
  }[status];

  // Different CSS for each different marker type
  return (
    <div
      aria-label={marker.label}
      title={marker.label}
      className={`flex h-6 w-6 justify-center items-center border-2  ${
        status === "requested"
          ? "px-(--space-2) border-dashed border-[2.5px] border-status-requested text-status-requested bg-status-requested-tint rounded-md type-marker-24"
          : status === "not_planted"
            ? "px-(--space-2) border-status-possible text-status-possible bg-status-possible-tint rounded-[7px] border-2 type-marker-24"
            : status === "approved"
              ? "px-(--space-2) border-status-approved-ring bg-status-approved text-status-approved-glyph rounded-md type-marker-24"
              : "border-(--color-primary-pressed) bg-status-planted border-2 rounded-md text-on-primary"
      }`}
    >
      {marker.glyph}
    </div>
  );
}
