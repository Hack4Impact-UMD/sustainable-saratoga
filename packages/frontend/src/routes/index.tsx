import type { MapMarker as MapMarkerData } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FilterSheet } from "@frontend/components/filters/FilterSheet.tsx";
import { MapOverlays } from "@frontend/components/map/MapOverlays.tsx";
import { MapView } from "@frontend/components/map/MapView.tsx";
import { useMapCamera } from "@frontend/components/map/useMapCamera.ts";
import { SearchBar } from "@frontend/components/search/SearchBar.tsx";
import { StatusMarker } from "@frontend/components/status/StatusMarker.tsx";
import { DEFAULT_FILTERS, countActiveFilters } from "@frontend/lib/filters.ts";
import { trpc } from "@frontend/lib/trpc.ts";

/** Keeps only a non-empty record ID from the root route's search params. */
export function validateSearch(search: Record<string, unknown>): {
  record?: string;
} {
  const record = search["record"];
  return typeof record === "string" && record.length > 0 ? { record } : {};
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
  const { record } = Route.useSearch();
  const markersQuery = useQuery(trpc.map.markers.queryOptions({}));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Local stand-in until search and filters are wired to the map and the URL.
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

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
    <main className="relative h-screen">
      <MapView
        markers={markersQuery.data}
        selectedId={selectedMarker?.id}
        onMarkerSelect={handleMarkerSelect}
        renderMarker={renderMarker}
      >
        <RecordCamera marker={selectedMarker} />
        <MapOverlays />
      </MapView>

      <div className="absolute top-4 right-4 left-20 z-50">
        <SearchBar
          query={query}
          activeFilterCount={countActiveFilters(filters)}
          onQueryChange={setQuery}
          onFilterClick={() => setIsFilterOpen(true)}
        />
      </div>

      <FilterSheet
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        applied={filters}
        onApply={setFilters}
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
