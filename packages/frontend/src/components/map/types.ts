import type { MapMarker } from "@repo/common";
import type { ReactNode } from "react";

export interface MapViewProps {
  markers: MapMarker[];
  selectedId?: string;
  onMarkerSelect: (id: string) => void;
  renderMarker: (marker: MapMarker, selected: boolean) => ReactNode;
  children?: ReactNode;
}
