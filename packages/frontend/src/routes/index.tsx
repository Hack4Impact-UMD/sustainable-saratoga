
import type { MapMarker as MapMarkerData, TreeStatus } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FilterSheet } from "@frontend/components/filters/FilterSheet.tsx";
import { MapOverlays } from "@frontend/components/map/MapOverlays.tsx";
import { MapView } from "@frontend/components/map/MapView.tsx";
import { matchesSearch } from "@frontend/lib/search.ts";
import { useMapCamera } from "@frontend/components/map/useMapCamera.ts";
import { SearchBar } from "@frontend/components/search/SearchBar.tsx";
import { TreeList } from "@frontend/components/landing/TreeList.tsx";
import type { SheetState } from "@frontend/components/landing/TreeList.tsx";
import { StatusMarker } from "@frontend/components/status/StatusMarker.tsx";
import {
  DEFAULT_FILTERS,
  STATUSES,
  allStatusesSelected,
  toMarkerQueryInput,
} from "@frontend/lib/filters.ts";
import type { Filters } from "@frontend/lib/filters.ts";
import { trpc } from "@frontend/lib/trpc.ts";

/** Keeps only a non-empty record ID from the root route's search params. */
export function validateSearch(search: Record<string, unknown>): {
  record?: string;
  view?: "planting" | "pruning";
  sheet?: SheetState;
} {
  const record = search["record"];
  const rawView = search["view"];
  const rawSheet = search["sheet"];

  const view: "planting" | "pruning" | undefined =
    rawView === "planting" || rawView === "pruning" ? rawView : undefined;
  const sheet: SheetState | undefined =
    rawSheet === "collapsed" ||
    rawSheet === "expanded" ||
    rawSheet === "partial"
      ? rawSheet
      : undefined;

  return {
    ...(typeof record === "string" && record.length > 0 ? { record } : {}),
    ...(view === undefined ? {} : { view }),
    ...(sheet === undefined ? {} : { sheet }),
  };
}

export const Route = createFileRoute("/")({
  validateSearch,
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

const STATUS_LABEL: Record<TreeStatus, string> = {
  requested: "Requested",
  possible: "Possible",
  approved: "Approved",
  planted: "Planted",
};

/** Loads map records and composes the map with its overlay controls. */
function Home() {
  const navigate = useNavigate();
  const { record, view = "planting", sheet = "partial" } = Route.useSearch();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
const [query, setQuery] = useState("");
const [appliedFilters, setAppliedFilters] = useState<Filters>(DEFAULT_FILTERS);
const markersQuery = useQuery(
  trpc.map.markers.queryOptions(toMarkerQueryInput(appliedFilters)),
);

const activeFilters = [
  ...appliedFilters.years.map((year) => ({
    id: `year-${year}`,
    label: String(year),
  })),
  ...(allStatusesSelected(appliedFilters.statuses)
    ? []
    : appliedFilters.statuses.map((status) => ({
        id: `status-${status}`,
        label: STATUS_LABEL[status],
      }))),
];

function removeFilter(id: string) {
  if (id.startsWith("year-")) {
    const year = Number(id.replace("year-", ""));
    setAppliedFilters((current) => ({
      ...current,
      years: current.years.filter((y) => y !== year),
    }));
    return;
  }

  const status = id.replace("status-", "") as TreeStatus;
  setAppliedFilters((current) => {
    const remaining = current.statuses.filter((s) => s !== status);
    return {
      ...current,
      statuses: remaining.length === 0 ? [...STATUSES] : remaining,
    };
  });
}

const markers =
  appliedFilters.statuses.length === 0
    ? []
    : (markersQuery.data ?? []).filter(
        (marker) =>
          marker.recordType === view && matchesSearch(marker, query),
      );
  const selectedMarker = findSelectedMarker(markers, record);

  /** Writes the selected marker ID to the URL search state. */
  function handleMarkerSelect(id: string) {
    void navigate({
      to: "/",
      search: (prev) => ({
        view: prev.view ?? "planting",
        sheet: prev.sheet ?? "partial",
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
        sheet: prev.sheet ?? "partial",
        ...(prev.record === undefined ? {} : { record: prev.record }),
      }),
    });
  }

  /** Updates the sheet state param while preserving other params. */
  function handleSheetChange(newSheet: SheetState) {
    void navigate({
      to: "/",
      search: (prev) => ({
        view: prev.view ?? "planting",
        sheet: newSheet,
        ...(prev.record === undefined ? {} : { record: prev.record }),
      }),
    });
  }

    return (
    <main
      className={`relative flex h-dvh flex-col ${sheet === "expanded" ? "pt-16" : ""}`}
    >
      {sheet !== "expanded" && (
        <div className="min-h-0 flex-1">
          <MapView
            markers={markers}
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
        markers={markers}
        isLoading={markersQuery.isPending}
        isError={markersQuery.isError}
        selectedId={selectedMarker?.id}
        view={view}
        sheet={sheet}
        onViewChange={handleViewChange}
        onSheetChange={handleSheetChange}
      />

      <div className="absolute top-4 right-4 left-20 z-50">
        <SearchBar
          query={query}
          activeFilterCount={activeFilters.length}
          activeFilters={activeFilters}
          onQueryChange={setQuery}
          onFilterClick={() => setIsFilterOpen(true)}
          onRemoveFilter={removeFilter}
        />
      </div>

      <FilterSheet
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        applied={appliedFilters}
        onApply={setAppliedFilters}
        query={query}
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
