import type { TreeStatus } from "@repo/common";
import { StatusMarker } from "@frontend/components/status/StatusMarker.tsx";

interface StatusStyle {
  label: string;
  badge: string;
}

const statusStyles = {
  requested: {
    label: "Requested",
    badge: "bg-status-requested-tint text-status-requested-text",
  },
  possible: {
    label: "Possible",
    badge: "bg-status-possible-tint text-status-possible-text",
  },
  approved: {
    label: "Approved",
    badge: "bg-status-approved-tint text-status-approved-text",
  },
  planted: {
    label: "Planted",
    badge: "bg-status-planted-tint text-status-planted-text",
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
      <StatusMarker status={status} size={24} />
      {styles.label}
    </span>
  );
}
