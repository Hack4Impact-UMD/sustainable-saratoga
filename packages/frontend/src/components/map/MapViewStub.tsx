import { MapOverlayLayer } from "@frontend/components/map/MapOverlayLayer.tsx";
import type { MapViewProps } from "@frontend/components/map/types.ts";
import { MapCameraContext } from "@frontend/components/map/useMapCamera.ts";
import type { MapCamera } from "@frontend/components/map/useMapCamera.ts";
import { stubCamera } from "@frontend/components/map/stubCamera.ts";
import { useEffect, useMemo } from "react";

export function MapViewStub({
  markers,
  selectedId,
  onMarkerSelect,
  renderMarker,
  defaultCenter,
  onCenterChange,
  children,
}: MapViewProps) {
  const camera = useMemo<MapCamera>(
    () => ({
      panTo: (pos, zoom) => {
        stubCamera.panTo(pos, zoom);
        onCenterChange?.(pos);
      },
      geocodingStatus: "unavailable",
      geocodeAddress: () =>
        Promise.reject(
          new Error("Address lookup is unavailable in the map preview."),
        ),
    }),
    [onCenterChange],
  );
  useEffect(() => {
    if (defaultCenter) onCenterChange?.(defaultCenter);
  }, [defaultCenter, onCenterChange]);

  return (
    <MapCameraContext.Provider value={camera}>
      <div
        data-testid="map-stub"
        className="relative h-full w-full overflow-auto bg-map-land p-4"
      >
        <p className="type-caption text-muted">
          Map preview. Set VITE_GOOGLE_MAPS_API_KEY to load Google Maps.
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {markers.map((marker) => {
            const selected = marker.id === selectedId;
            return (
              <li key={marker.id}>
                <button
                  type="button"
                  aria-label={marker.id}
                  aria-pressed={selected}
                  onClick={() => onMarkerSelect(marker.id)}
                  className="flex min-h-touch min-w-touch items-center justify-center rounded-pill"
                >
                  {renderMarker(marker, selected)}
                </button>
              </li>
            );
          })}
        </ul>
        <MapOverlayLayer>{children}</MapOverlayLayer>
      </div>
    </MapCameraContext.Provider>
  );
}
