import type { MapMarker } from "@repo/common";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { StatusMarker } from "@frontend/components/status/StatusMarker.tsx";
import { treeLabel } from "./treeLabel.ts";

const statusLabels: Record<MapMarker["status"], string> = {
  requested: "Requested",
  possible: "Possible",
  approved: "Approved",
  planted: "Planted",
};

/**
 * Formats a kebab-case or slug ID into a proper name.
 * "dana-ruiz" → "Dana Ruiz"
 */
function formatName(raw: string): string {
  return raw
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface TreeRowProps {
  marker: MapMarker;
  selectedId?: string;
}

export function TreeRow({ marker, selectedId }: TreeRowProps) {
  const navigate = useNavigate();
  const isSelected = marker.id === selectedId;

  function handleClick() {
    void navigate({
      to: "/records/$recordId",
      params: { recordId: marker.id },
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover${isSelected ? " bg-hover" : ""}`}
    >
      <StatusMarker status={marker.status} size={24} selected={isSelected} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Address label — 17px/24px medium sans (type-h3) */}
        <span className="type-h3 truncate text-heading">
          {treeLabel(marker)}
        </span>
        {/* Status · Name — 16px/22px regular sans, muted (type-supporting) */}
        <span className="type-supporting truncate">
          {statusLabels[marker.status]} · {formatName(marker.issuedBy)}
        </span>
      </div>
      {/* Chevron — black */}
      <ChevronRight size={20} className="shrink-0 text-heading" />
    </button>
  );
}
