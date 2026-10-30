import type { MapMarker as MapMarkerData } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import { MapOverlays } from "@frontend/components/map/MapOverlays.tsx";
import { MapMarker } from "@frontend/components/map/MapMarker.tsx";
import { MapView } from "@frontend/components/map/MapView.tsx";
import { useMapCamera } from "@frontend/components/map/useMapCamera.ts";
import { trpc } from "@frontend/lib/trpc.ts";
import { useEffect } from "react";

/** Keeps only a non-empty record ID from the root route's search params. */
export function validateSearch(search: Record<string, unknown>): {
  record?: string;
} {
  const record = search["record"];
  return typeof record === "string" && record.length > 0 ? { record } : {};
}

export const Route = createFileRoute("/")({
  validateSearch,
  component: Home,
});

/** Loads map records and composes the map with its overlay controls. */
function Home() {
  const navigate = useNavigate();
  const { record } = Route.useSearch();
  const markersQuery = useQuery(trpc.map.markers.queryOptions({}));

  if (markersQuery.isPending) {
    return <output>Loading map...</output>;
  }

  if (markersQuery.isError) {
    return (
      <output role="alert">
        The map data couldn&apos;t load. Please try again later.
      </output>
    );
  }

  const selectedMarker = findSelectedMarker(markersQuery.data, record);

  /** Writes the selected marker ID to the URL search state. */
  function handleMarkerSelect(id: string) {
    void navigate({ to: "/", search: { record: id } });
  }

  return (
    <main className="h-screen">
      <MapView
        markers={markersQuery.data}
        selectedId={selectedMarker?.id}
        onMarkerSelect={handleMarkerSelect}
        renderMarker={renderMarker}
      >
        <RecordCamera marker={selectedMarker} />
        <MapOverlays />
      </MapView>
    </main>
  );
}

/** Finds the marker represented by the optional URL record ID. */
export function findSelectedMarker(
  markers: MapMarkerData[],
  record: string | undefined,
): MapMarkerData | undefined {
  return markers.find((marker) => marker.id === record);
}

/** Pans the map to the marker selected by the URL. */
function RecordCamera({ marker }: { marker?: MapMarkerData }) {
  const { panTo } = useMapCamera();

  useEffect(() => {
    if (marker) {
      panTo({ lat: marker.lat, lng: marker.lng });
    }
  }, [marker, panTo]);

  return null;
}

/** Supplies the reusable marker glyph component to MapView. */
function renderMarker(marker: MapMarkerData, selected: boolean) {
  return <MapMarker marker={marker} selected={selected} />;
}
