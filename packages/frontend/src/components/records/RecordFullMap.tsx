import type { TreeRecord } from "@repo/common";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, LocateFixed } from "lucide-react";
import { MapView } from "@frontend/components/map/MapView.tsx";
import { useMapCamera } from "@frontend/components/map/useMapCamera.ts";
import {
  recordToMarker,
  renderRecordMarker,
} from "@frontend/components/records/recordMarkers.tsx";

const FULL_MAP_ZOOM = 17;

/** Full-screen map: this tree's pin highlighted, other trees for context. */
export function RecordFullMap({
  record,
  others,
}: {
  record: TreeRecord;
  others: TreeRecord[];
}) {
  const markers = [record, ...others.filter((r) => r.id !== record.id)].map(
    recordToMarker,
  );

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-divider px-4">
        <Link
          to="/records/$recordId"
          params={{ recordId: record.id }}
          aria-label="Back to record"
          className="absolute left-2 grid size-11 place-items-center text-icon-primary"
        >
          <ChevronLeft aria-hidden="true" className="size-6" />
        </Link>
        <h1 className="type-body-strong min-w-0 truncate font-display text-heading">
          {record.address}
        </h1>
      </header>
      <div className="min-h-0 flex-1">
        <MapView
          markers={markers}
          selectedId={record.id}
          // Other pins are for context only, so a tap does nothing.
          onMarkerSelect={() => {}}
          renderMarker={renderRecordMarker}
          defaultCenter={{ lat: record.lat, lng: record.lng }}
          defaultZoom={FULL_MAP_ZOOM}
        >
          <RecenterButton record={record} />
        </MapView>
      </div>
    </div>
  );
}

/** Brings the map back to this record's tree. */
function RecenterButton({ record }: { record: TreeRecord }) {
  const { panTo } = useMapCamera();
  return (
    <div className="pointer-events-none flex h-full items-end justify-end p-4">
      <button
        type="button"
        aria-label="Re-center on tree"
        onClick={() =>
          panTo({ lat: record.lat, lng: record.lng }, FULL_MAP_ZOOM)
        }
        className="pointer-events-auto grid size-11 place-items-center rounded-pill bg-surface text-primary shadow-1 hover:bg-pressed active:bg-selected"
      >
        <LocateFixed aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
