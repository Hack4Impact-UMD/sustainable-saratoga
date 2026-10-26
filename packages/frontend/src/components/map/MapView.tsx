import {
  AdvancedMarker,
  APILoadingStatus,
  APIProvider,
  Map,
  useApiLoadingStatus,
  useMap,
} from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { MapOverlayLayer } from "@frontend/components/map/MapOverlayLayer.tsx";
import { MapViewStub } from "@frontend/components/map/MapViewStub.tsx";
import type { MapViewProps } from "@frontend/components/map/types.ts";
import { MapCameraContext } from "@frontend/components/map/useMapCamera.ts";
import type {
  MapCamera,
  PanToCall,
} from "@frontend/components/map/useMapCamera.ts";

export type { MapViewProps } from "@frontend/components/map/types.ts";

/** Downtown Saratoga Springs. */
const DEFAULT_CENTER = { lat: 43.0831, lng: -73.7846 };
const DEFAULT_ZOOM = 15;

export function MapView(props: MapViewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

  if (!apiKey) {
    if (import.meta.env.DEV) return <MapViewStub {...props} />;
    return (
      <MapFallback reason="VITE_GOOGLE_MAPS_API_KEY is not set.">
        {props.children}
      </MapFallback>
    );
  }
  if (!mapId) {
    return (
      <MapFallback reason="VITE_GOOGLE_MAPS_MAP_ID is not set.">
        {props.children}
      </MapFallback>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <GoogleMap mapId={mapId} {...props} />
    </APIProvider>
  );
}

function GoogleMap({
  mapId,
  markers,
  selectedId,
  onMarkerSelect,
  renderMarker,
  children,
}: MapViewProps & { mapId: string }) {
  const status = useApiLoadingStatus();
  if (
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <MapFallback reason={`Google Maps failed to load (${status}).`}>
        {children}
      </MapFallback>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Map
        className="h-full w-full"
        mapId={mapId}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        disableDefaultUI
        gestureHandling="greedy"
        clickableIcons={false}
      >
        {markers.map((marker) => {
          const selected = marker.id === selectedId;
          return (
            <AdvancedMarker
              key={marker.id}
              position={{ lat: marker.lat, lng: marker.lng }}
              onClick={() => onMarkerSelect(marker.id)}
              zIndex={selected ? 1 : undefined}
            >
              {renderMarker(marker, selected)}
            </AdvancedMarker>
          );
        })}
      </Map>
      <GoogleMapCamera>
        <MapOverlayLayer>{children}</MapOverlayLayer>
      </GoogleMapCamera>
    </div>
  );
}

function GoogleMapCamera({ children }: { children?: ReactNode }) {
  const map = useMap();
  const pending = useRef<PanToCall | null>(null);

  useEffect(() => {
    if (!map || !pending.current) return;
    moveCamera(map, pending.current);
    pending.current = null;
  }, [map]);

  const camera = useMemo<MapCamera>(
    () => ({
      panTo: (pos, zoom) => {
        if (map) moveCamera(map, { pos, zoom });
        else pending.current = { pos, zoom };
      },
    }),
    [map],
  );
  return (
    <MapCameraContext.Provider value={camera}>
      {children}
    </MapCameraContext.Provider>
  );
}

type GoogleMapInstance = NonNullable<ReturnType<typeof useMap>>;

function moveCamera(map: GoogleMapInstance, { pos, zoom }: PanToCall) {
  map.panTo(pos);
  if (zoom !== undefined) map.setZoom(zoom);
}

const noopCamera: MapCamera = { panTo: () => {} };

function MapFallback({
  reason,
  children,
}: {
  reason: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-map-land p-4">
      <output className="type-body-sm block rounded-md border border-line-warning bg-attention px-3 py-2 text-warning">
        <p className="type-body-strong text-warning">
          The map couldn&apos;t load.
        </p>
        <p>Try again later.</p>
        {import.meta.env.DEV && <p className="mt-1">{reason}</p>}
      </output>
      <MapCameraContext.Provider value={noopCamera}>
        <MapOverlayLayer>{children}</MapOverlayLayer>
      </MapCameraContext.Provider>
    </div>
  );
}
