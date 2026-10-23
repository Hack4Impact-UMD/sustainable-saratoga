import type { Firestore } from "firebase-admin/firestore";
import type { MapMarker, MapMarkersInput } from "@repo/common";
import { mockMapMarkers } from "@backend/services/mockMapMarkers.ts";

/**
 * Returns markers matching the filters. Reads mock data until a trees
 * collection exists. `_db` stays on the signature so that query can replace
 * the fixture without changing callers.
 */
export function listMapMarkers(
  _db: Firestore,
  filters: MapMarkersInput,
): MapMarker[] {
  return mockMapMarkers
    .filter((marker) => matchesFilters(marker, filters))
    .map((marker) => ({ ...marker }));
}

function matchesFilters(marker: MapMarker, filters: MapMarkersInput): boolean {
  if (filters.status !== undefined && marker.status !== filters.status) {
    return false;
  }

  if (filters.year !== undefined && marker.plantedYear !== filters.year) {
    return false;
  }

  return true;
}
