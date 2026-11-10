import type { MapMarker as MapMarkerData } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { MapOverlays } from "@frontend/components/map/MapOverlays.tsx";
import { MapView } from "@frontend/components/map/MapView.tsx";
import { StatusMarker } from "@frontend/components/status/StatusMarker.tsx";
import { TreeList } from "@frontend/components/landing/TreeList.tsx";
import { useMapCamera } from "@frontend/components/map/useMapCamera.ts";
import { trpc } from "@frontend/lib/trpc.ts";
import { useEffect } from "react";

/** Keeps only a non-empty record ID from the root route's search params. */
export function validateSearch(search: Record<string, unknown>): {
  record?: string;
  view: "planting" | "pruning";
  expanded: boolean;
} {
  const record = search["record"];
  const rawView = search["view"];
  const rawExpanded = search["expanded"];

  const view: "planting" | "pruning" =
    rawView === "planting" || rawView === "pruning" ? rawView : "planting";
  const expanded = rawExpanded === true ? true : false;

  return {
    ...(typeof record === "string" && record.length > 0 ? { record } : {}),
    view,
    expanded,
  };
}

export const Route = createFileRoute("/")({
  validateSearch,
  // Temporary: the landing page has no signed-out view yet, so send visitors to
  // sign in instead of showing a blank page.
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthed) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: Home,
});

/** Loads map records and composes the map with its overlay controls. */
function Home() {
  const navigate = useNavigate();
  const { record, view, expanded } = Route.useSearch();
  const markersQuery = useQuery(trpc.map.markers.queryOptions({}));

  const selectedMarker = findSelectedMarker(markersQuery.data ?? [], record);

  /** Writes the selected marker ID to the URL search state. */
  function handleMarkerSelect(id: string) {
    void navigate({
      to: "/",
      search: (prev) => ({
        view: prev.view ?? "planting",
        expanded: prev.expanded ?? false,
        ...(prev.record !== undefined ? { record: prev.record } : {}),
        record: id,
      }),
    });
  }

  /** Updates the view param while preserving other params. */
  function handleViewChange(newView: "planting" | "pruning") {
    void navigate({
      to: "/",
      search: (prev) => ({
        view: newView,
        expanded: prev.expanded ?? false,
        ...(prev.record !== undefined ? { record: prev.record } : {}),
      }),
    });
  }

  /** Updates the expanded param while preserving other params. */
  function handleExpandedChange(newExpanded: boolean) {
    void navigate({
      to: "/",
      search: (prev) => ({
        view: prev.view ?? "planting",
        expanded: newExpanded,
        ...(prev.record !== undefined ? { record: prev.record } : {}),
      }),
    });
  }

  return (
    <main className="h-screen flex flex-col">
      {!expanded && (
        <div className="flex-1 min-h-0">
          <MapView
            markers={markersQuery.data ?? []}
            selectedId={selectedMarker?.id}
            onMarkerSelect={handleMarkerSelect}
            renderMarker={renderMarker}
          >
            <RecordCamera marker={selectedMarker} />
            <MapOverlays />
          </MapView>
        </div>
      )}
      <TreeList
        markers={markersQuery.data}
        isLoading={markersQuery.isPending}
        isError={markersQuery.isError}
        selectedId={selectedMarker?.id}
        view={view}
        expanded={expanded}
        onViewChange={handleViewChange}
        onExpandedChange={handleExpandedChange}
      />
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

/** Draws a record's status pin, enlarged when it is the selected record. */
function renderMarker(marker: MapMarkerData, selected: boolean) {
  return (
    <StatusMarker
      status={marker.status}
      size={selected ? 44 : 32}
      selected={selected}
    />
  );
}
