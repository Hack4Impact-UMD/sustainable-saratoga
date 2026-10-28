import { createContext, useContext } from "react";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PanToCall {
  pos: LatLng;
  zoom?: number;
}

export interface MapCamera {
  panTo: (pos: LatLng, zoom?: number) => void;
}

export const MapCameraContext = createContext<MapCamera | null>(null);

export function useMapCamera(): MapCamera {
  const camera = useContext(MapCameraContext);
  if (!camera) {
    throw new Error("useMapCamera must be used inside <MapView>.");
  }
  return camera;
}
