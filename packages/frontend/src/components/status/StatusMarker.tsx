import type { TreeStatus } from "@repo/common";
import { Check } from "lucide-react";

export type StatusMarkerSize = 20 | 24 | 32 | 44;

interface StatusMarkerProps {
  status: TreeStatus;
  size: StatusMarkerSize;
  selected?: boolean;
}

const markerSizes: Record<
  StatusMarkerSize,
  { className: string; typeClass: string; checkClass: string }
> = {
  20: {
    className: "size-5",
    typeClass: "type-marker-20",
    checkClass: "size-3",
  },
  24: {
    className: "size-6",
    typeClass: "type-marker-24",
    checkClass: "size-3",
  },
  32: {
    className: "size-8",
    typeClass: "type-marker-32",
    checkClass: "size-4",
  },
  44: {
    className: "size-11",
    typeClass: "type-marker-44",
    checkClass: "size-6",
  },
};

const markerStyles: Record<
  TreeStatus,
  { marker: string; shape: string; label: string }
> = {
  requested: {
    marker: "bg-status-requested-tint text-status-requested",
    shape: "rounded-full",
    label: "R",
  },
  possible: {
    marker:
      "border-2 border-status-possible bg-status-possible-tint text-status-possible",
    shape: "rounded-input",
    label: "P",
  },
  approved: {
    marker:
      "border-2 border-status-approved-ring bg-status-approved text-status-approved-glyph",
    shape: "rounded-full",
    label: "A",
  },
  planted: {
    marker: "border-2 border-primary-pressed bg-status-planted text-on-primary",
    shape: "rounded-full",
    label: "",
  },
};

export function StatusMarker({
  status,
  size,
  selected = false,
}: StatusMarkerProps) {
  const markerSize = markerSizes[size];
  const styles = markerStyles[status];
  const requestedCircleRadius = (size - (size === 44 ? 4 : 3)) / 2;

  return (
    <span
      role="img"
      aria-label={`${status} status${selected ? ", selected" : ""}`}
      className={`relative grid ${markerSize.className} shrink-0 place-items-center ${styles.marker} ${styles.shape} ${selected ? "shadow-pin-selected" : "shadow-pin"}`}
    >
      {status === "requested" && (
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          fill="none"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={requestedCircleRadius}
            stroke="currentColor"
            strokeDasharray="4 3"
            strokeWidth={size === 44 ? 3 : 2}
          />
        </svg>
      )}
      {status === "planted" ? (
        <Check
          aria-hidden="true"
          className={markerSize.checkClass}
          strokeWidth={2.5}
        />
      ) : (
        <span className={`relative ${markerSize.typeClass}`}>
          {styles.label}
        </span>
      )}
    </span>
  );
}
