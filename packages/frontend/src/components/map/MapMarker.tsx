import { Check } from "lucide-react";
import type { MapMarker as MapMarkerData } from "@repo/common";

export interface MapMarkerProps {
  marker: MapMarkerData;
  selected: boolean;
}

/**
 * Renders the status glyph used for a map record.
 */
export function MapMarker({ marker, selected }: MapMarkerProps) {
  const markerContent = {
    requested: { glyph: "R", label: "Requested marker" },
    not_planted: { glyph: "P", label: "Possible marker" },
    approved: { glyph: "A", label: "Approved marker" },
    planted: {
      glyph: <Check className="h-4.5 w-4.5 stroke-3" />,
      label: "Planted marker",
    },
  }[marker.status];

  // Special formatting for a selected marker
  const selectionClasses = selected
    ? "w-[44px] h-[44px] shadow-pin-selected type-marker-44"
    : "";

  return (
    <div
      aria-label={markerContent.label}
      data-selected={selected}
      title={markerContent.label}
      className={`flex h-8 w-8 items-center justify-center border-2 shadow-pin ${selectionClasses} ${
        marker.status === "requested"
          ? "px-(--space-2) border-[2.5px] border-dashed border-status-requested bg-status-requested-tint text-status-requested rounded-pill type-marker-32"
          : marker.status === "not_planted"
            ? "px-(--space-2) border-2 border-status-possible bg-status-possible-tint text-status-possible rounded-[7px] type-marker-32"
            : marker.status === "approved"
              ? "px-(--space-2) border-2 border-status-approved-ring bg-status-approved text-status-approved-glyph rounded-pill type-marker-32"
              : "border-2 border-primary-pressed bg-status-planted text-on-primary rounded-pill"
      }`}
    >
      {markerContent.glyph}
    </div>
  );
}
