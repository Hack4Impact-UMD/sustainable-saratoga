import type { TreeStatus } from "@repo/common";
import { Check } from "lucide-react";

interface StatusStyle {
  label: string;
  badge: string;
  marker: string;
  markerShape: string;
  markerLabel: string;
}

const statusStyles = {
  requested: {
    label: "Requested",
    badge: "bg-status-requested-tint text-status-requested-text",
    marker: "text-status-requested",
    markerShape: "rounded-full",
    markerLabel: "R",
  },
  possible: {
    label: "Possible",
    badge: "bg-status-possible-tint text-status-possible-text",
    marker: "border-2 border-status-possible text-status-possible",
    markerShape: "rounded-input",
    markerLabel: "P",
  },
  approved: {
    label: "Approved",
    badge: "bg-status-approved-tint text-status-approved-text",
    marker:
      "border-2 border-status-approved-ring bg-status-approved text-status-approved-glyph",
    markerShape: "rounded-full",
    markerLabel: "A",
  },
  planted: {
    label: "Planted",
    badge: "bg-status-planted-tint text-status-planted-text",
    marker: "border-2 border-primary-pressed bg-status-planted text-on-primary",
    markerShape: "rounded-full",
    markerLabel: "",
  },
} satisfies Record<TreeStatus, StatusStyle>;

interface StatusBadgeProps {
  status: TreeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = statusStyles[status];

  return (
    <span
      className={`type-badge flex h-10 w-full items-center gap-2 rounded-sm px-2 ${styles.badge}`}
    >
      <span
        aria-hidden="true"
        className={`relative grid size-6 shrink-0 place-items-center ${styles.marker} ${styles.markerShape} type-marker-24`}
      >
        {status === "requested" && (
          <svg
            aria-hidden="true"
            className="absolute inset-0 size-full"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10.5"
              stroke="currentColor"
              strokeDasharray="4 3"
              strokeWidth="2"
            />
          </svg>
        )}
        {status === "planted" ? (
          <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
        ) : (
          <span className="relative">{styles.markerLabel}</span>
        )}
      </span>
      {styles.label}
    </span>
  );
}
