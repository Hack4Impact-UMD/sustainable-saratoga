import type { MapMarker } from "@repo/common";
import type { ReactNode } from "react";

export interface MapViewProps {
  markers: MapMarker[];
  selectedId?: string;
  onMarkerSelect: (id: string) => void;
  renderMarker: (marker: MapMarker, selected: boolean) => ReactNode;
  /** Where the map starts. Defaults to downtown Saratoga Springs. */
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  /** Called as the map center changes, including while the user drags. */
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  /** When false the map can't be dragged or zoomed (e.g. a preview). */
  interactive?: boolean;
  children?: ReactNode;
}
