import type { MapMarker, TreeRecord } from "@repo/common";
import { StatusPin } from "@frontend/components/status/StatusPin.tsx";

/** The public map-marker shape for a record, so MapView can draw it. */
export function recordToMarker(record: TreeRecord): MapMarker {
  return {
    id: record.id,
    lat: record.lat,
    lng: record.lng,
    address: record.address,
    treeNumber: record.treeNumber,
    treeCount: record.treeCount,
    recordType: "planting",
    status: record.status,
    seasonYear: record.eventPlantingDetails.year ?? new Date().getFullYear(),
    issuedBy: "Sustainable Saratoga",
  };
}

/** Selected pin is large with its address above it; the rest are inert. */
export function renderRecordMarker(marker: MapMarker, selected: boolean) {
  if (!selected) {
    return (
      <div className="pointer-events-none">
        <StatusPin status={marker.status} width={26} />
      </div>
    );
  }
  return (
    <div className="relative">
      <span className="type-chip absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded-input bg-surface px-3 py-1.5 whitespace-nowrap text-heading shadow-1">
        {marker.address}
      </span>
      <StatusPin status={marker.status} width={36} selected />
    </div>
  );
}
