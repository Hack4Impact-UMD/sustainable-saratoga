import type { MapMarker } from "@repo/common";


 //Searches by address and species, ignoring capitalization and leading/trailing whitespace
export function matchesSearch(marker: MapMarker, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  //an empty search should return every marker.
  if (!normalizedQuery) {
    return true;
  }

  const address = marker.address.toLowerCase();
  const species = marker.species?.toLowerCase() ?? "";

  return (
    address.includes(normalizedQuery) ||
    species.includes(normalizedQuery)
  );
}
