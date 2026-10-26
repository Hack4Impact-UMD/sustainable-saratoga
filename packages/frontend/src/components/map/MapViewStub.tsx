import { MapOverlayLayer } from "@frontend/components/map/MapOverlayLayer.tsx";
import type { MapViewProps } from "@frontend/components/map/types.ts";
import { MapCameraContext } from "@frontend/components/map/useMapCamera.ts";
import { stubCamera } from "@frontend/components/map/stubCamera.ts";

export function MapViewStub({
  markers,
  selectedId,
  onMarkerSelect,
  renderMarker,
  children,
}: MapViewProps) {
  return (
    <MapCameraContext.Provider value={stubCamera}>
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
