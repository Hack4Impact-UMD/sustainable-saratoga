import type { TreeRecord } from "@repo/common";
import { Link } from "@tanstack/react-router";
import { Maximize2 } from "lucide-react";
import { MapView } from "@frontend/components/map/MapView.tsx";
import {
  recordToMarker,
  renderRecordMarker,
} from "@frontend/components/records/recordMarkers.tsx";

/** Small, non-interactive map inside Location; the icon opens the full map. */
export function RecordMapPreview({ record }: { record: TreeRecord }) {
  return (
    <div className="relative h-40 overflow-hidden rounded-md border border-divider">
      <MapView
        markers={[recordToMarker(record)]}
        selectedId={record.id}
        onMarkerSelect={() => {}}
        renderMarker={renderRecordMarker}
        defaultCenter={{ lat: record.lat, lng: record.lng }}
        defaultZoom={17}
        interactive={false}
      />
      <Link
        to="/records/$recordId/map"
        params={{ recordId: record.id }}
        aria-label="Open full map"
        className="absolute top-2 right-2 grid size-11 place-items-center rounded-pill bg-surface text-icon-primary shadow-1 hover:bg-pressed"
      >
        <Maximize2 aria-hidden="true" className="size-5" />
      </Link>
    </div>
  );
}
