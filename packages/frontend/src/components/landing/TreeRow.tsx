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
      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${isSelected ? "bg-success-tint" : ""}`}
    >
      <StatusMarker status={marker.status} size={24} selected={isSelected} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="type-body-strong truncate">{treeLabel(marker)}</span>
        <span className="type-body-sm text-secondary truncate">
          {statusLabels[marker.status]} · {marker.issuedBy}
        </span>
      </div>
      <ChevronRight size={20} className="text-secondary shrink-0" />
    </button>
  );
}
