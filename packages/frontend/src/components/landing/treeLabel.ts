import type { MapMarker } from "@repo/common";

/**
 * Returns just the address when there is only one tree at the address.
 * Returns "Address · Tree #N" when there are multiple trees.
 */
export function treeLabel(marker: MapMarker): string {
  if (marker.treeCount === 1) return marker.address;
  return `${marker.address} · Tree #${marker.treeNumber}`;
}
