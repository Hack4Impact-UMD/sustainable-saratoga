import { useCallback, useEffect, useRef, useState } from "react";
import type { TreeStatus } from "@repo/common";
import { Check, ChevronLeft, LocateFixed, LoaderCircle } from "lucide-react";
import { MapView } from "@frontend/components/map/MapView.tsx";
import { StatusPin } from "@frontend/components/status/StatusPin.tsx";
import { useMapCamera } from "@frontend/components/map/useMapCamera.ts";
import type { LatLng } from "@frontend/components/map/useMapCamera.ts";
import { useCurrentPosition } from "@frontend/lib/useCurrentPosition.ts";

const SARATOGA_CENTER = { lat: 43.0831, lng: -73.7846 };
const ZOOM_ON_PIN = 18;
const METERS_TO_FEET = 3.28084;

export interface PinPlacementResult extends LatLng {
  accuracyMeters: number | null;
  nearbyAddress?: string;
}

type SaveState =
  | { status: "idle" }
  | { status: "saving"; spot: PinPlacementResult }
  | { status: "saved"; spot: PinPlacementResult };

interface PinPlacementProps {
  address?: string;
  city?: string;
  state?: string;
  status?: Extract<TreeStatus, "requested" | "possible">;
  mode?: "place" | "move" | "map";
  nearbyAddresses?: NearbyAddress[];
  initialCenter?: LatLng;
  initialAccuracyMeters?: number | null;
  onBack: () => void;
  onUseSpot: (spot: PinPlacementResult) => void;
}

interface NearbyAddress extends LatLng {
  address: string;
}

/** Full-screen map with a fixed center pin for choosing the planting spot. */
export function PinPlacement({
  address,
  city,
  state,
  status = "requested",
  mode = "place",
  nearbyAddresses = [],
  initialCenter,
  initialAccuracyMeters = null,
  onBack,
  onUseSpot,
}: PinPlacementProps) {
  const mapInitialCenter = initialCenter ?? SARATOGA_CENTER;
  const [center, setCenter] = useState(mapInitialCenter);
  const [geocodeError, setGeocodeError] = useState("");
  const [nearbyAddress, setNearbyAddress] = useState(address ?? "");
  const [nearbyAddressError, setNearbyAddressError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const nearbyAddressRef = useRef(nearbyAddress);
  const {
    locate,
    status: locationStatus,
    position,
    accuracyMeters: locatedAccuracy,
  } = useCurrentPosition();
  const accuracyMeters = locatedAccuracy ?? initialAccuracyMeters;
  const isLocating = locationStatus === "requesting";
  const locationError =
    locationStatus === "denied"
      ? "Location access was denied. Enable it in your browser settings to find your position."
      : locationStatus === "error"
        ? "Your location could not be found. Please try again."
        : "";

  const updateCenter = useCallback((nextCenter: LatLng) => {
    setCenter((current) =>
      current.lat === nextCenter.lat && current.lng === nextCenter.lng
        ? current
        : nextCenter,
    );
  }, []);

  const feetAccuracy =
    accuracyMeters === null
      ? null
      : Math.round(accuracyMeters * METERS_TO_FEET);
  const accuracy =
    feetAccuracy === null
      ? null
      : feetAccuracy <= 16
        ? { label: "Good", tone: "good" as const }
        : feetAccuracy <= 33
          ? { label: "Fair", tone: "fair" as const }
          : { label: "Poor", tone: "poor" as const };
  const addressLabel =
    mode === "move" || mode === "map"
      ? nearbyAddress
        ? `Near to ${nearbyAddress}`
        : "Finding nearby address..."
      : (address ?? "Selected spot");
  const cityLine = [city, state].filter(Boolean).join(", ");

  useEffect(() => {
    nearbyAddressRef.current = nearbyAddress;
  }, [nearbyAddress]);

  useEffect(() => {
    if (saveState.status === "idle") return;

    const timer = window.setTimeout(() => {
      if (saveState.status === "saving") {
        setSaveState({ ...saveState, status: "saved" });
      } else {
        onUseSpot({
          ...saveState.spot,
          ...(mode !== "place" && nearbyAddressRef.current
            ? { nearbyAddress: nearbyAddressRef.current }
            : {}),
        });
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [mode, onUseSpot, saveState]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface pt-[env(safe-area-inset-top)]">
      <header className="relative z-10 flex h-13 shrink-0 items-center justify-center border-b border-divider bg-surface px-4">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="absolute left-2 grid size-11 place-items-center text-icon-primary"
        >
          <ChevronLeft aria-hidden="true" className="size-6" />
        </button>
        <h1 className="type-h2 font-display text-heading">Place pin</h1>
      </header>

      <main className="relative min-h-0 flex-1">
        <MapView
          markers={[]}
          onMarkerSelect={() => {}}
          renderMarker={() => null}
          defaultCenter={mapInitialCenter}
          defaultZoom={ZOOM_ON_PIN}
          onCenterChange={updateCenter}
        >
          <RecenterOnPosition status={locationStatus} position={position} />
          <MapAddressLookup
            address={initialCenter || mode !== "place" ? undefined : address}
            onResolved={updateCenter}
            onError={setGeocodeError}
          />
          <NearbyAddressLookup
            enabled={mode !== "place"}
            center={center}
            candidates={nearbyAddresses}
            fallbackAddress={address}
            onResolved={setNearbyAddress}
            onError={setNearbyAddressError}
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col">
            <p className="type-body-sm mx-auto mt-4 max-w-[calc(100%-32px)] rounded-pill bg-heading px-4 py-2 text-on-primary shadow-2">
              {mode === "place"
                ? "Drag the map to the exact planting spot"
                : "Drag the map — the pin stays in the middle"}
            </p>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
              <StatusPin status={status} width={44} selected />
            </div>
            <div className="flex-1" />
            <button
              type="button"
              aria-label="Center map on my location"
              aria-busy={isLocating}
              disabled={isLocating}
              onClick={locate}
              className="pointer-events-auto mr-4 mb-3 grid size-11 shrink-0 place-items-center self-end rounded-pill bg-surface text-primary shadow-1 hover:bg-hover disabled:opacity-60"
            >
              <LocateFixed aria-hidden="true" className="size-5" />
            </button>
            <section
              aria-label="Selected location"
              className="pointer-events-auto rounded-t-lg bg-surface px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] shadow-sheet sm:mx-auto sm:w-full sm:max-w-[520px]"
            >
              <p className="type-caption text-body-muted">Pin is at</p>
              <p className="type-body-strong mt-1 text-heading">
                {addressLabel}
              </p>
              {cityLine && (
                <p className="type-body-sm mt-1 text-body-muted">{cityLine}</p>
              )}

              <div className="mt-4 border-t border-divider pt-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="type-caption text-body-muted">Coordinates</p>
                    <p className="type-body-sm font-semibold text-heading">
                      {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="type-caption text-body-muted">GPS accuracy</p>
                    {accuracy && feetAccuracy !== null ? (
                      <span
                        className={`type-control mt-0.5 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 ${accuracyToneClass(accuracy.tone)}`}
                      >
                        <span
                          aria-hidden="true"
                          className="size-2 rounded-pill bg-current"
                        />
                        {feetAccuracy} ft · {accuracy.label}
                      </span>
                    ) : (
                      <p className="type-caption text-body-muted">
                        Not available
                      </p>
                    )}
                  </div>
                </div>

                {accuracy?.tone === "poor" && (
                  <p className="type-body-sm mt-2 text-error">
                    GPS accuracy is low. Move to a clearer area or adjust the
                    pin manually.
                  </p>
                )}
                {locationError && (
                  <p role="alert" className="type-body-sm mt-2 text-error">
                    {locationError}
                  </p>
                )}
                {geocodeError && (
                  <p role="alert" className="type-body-sm mt-2 text-error">
                    {geocodeError}
                  </p>
                )}
                {nearbyAddressError && (
                  <p role="alert" className="type-body-sm mt-2 text-error">
                    {nearbyAddressError}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={saveState.status !== "idle"}
                onClick={() => {
                  setSaveState({
                    status: "saving",
                    spot: {
                      ...center,
                      accuracyMeters,
                    },
                  });
                }}
                className={`type-btn-primary mt-3 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-pill px-5 ${saveState.status === "saving" ? "cursor-wait bg-divider text-body-muted" : saveState.status === "saved" ? "bg-primary-pressed text-on-primary" : "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed"}`}
              >
                {saveState.status === "idle" ? (
                  "Use this spot"
                ) : saveState.status === "saving" ? (
                  <>
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-5 animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check aria-hidden="true" className="size-5" />
                    Saved
                  </>
                )}
              </button>
            </section>
          </div>
        </MapView>
      </main>
    </div>
  );
}

function RecenterOnPosition({
  status,
  position,
}: {
  status: string;
  position: LatLng | null;
}) {
  const { panTo } = useMapCamera();
  useEffect(() => {
    if (status === "success" && position) panTo(position, ZOOM_ON_PIN);
  }, [panTo, position, status]);
  return null;
}

function MapAddressLookup({
  address,
  onResolved,
  onError,
}: {
  address?: string;
  onResolved: (center: LatLng) => void;
  onError: (message: string) => void;
}) {
  const { geocodingStatus, geocodeAddress, panTo } = useMapCamera();

  useEffect(() => {
    if (!address) return;
    if (geocodingStatus === "loading") return;
    if (geocodingStatus === "unavailable") {
      onError("Address lookup is unavailable. Drag the map to choose a spot.");
      return;
    }

    let active = true;
    onError("");
    void (async () => {
      try {
        const location = await geocodeAddress(
          `${address}, Saratoga Springs, NY`,
        );
        if (!active) return;
        onResolved(location);
        panTo(location, ZOOM_ON_PIN);
      } catch (error) {
        if (active) {
          const reason =
            error instanceof Error
              ? error.message
              : "The address lookup failed.";
          onError(`${reason} Drag the map to choose the spot.`);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [address, geocodeAddress, geocodingStatus, onError, onResolved, panTo]);

  return null;
}

function NearbyAddressLookup({
  enabled,
  center,
  candidates,
  fallbackAddress,
  onResolved,
  onError,
}: {
  enabled: boolean;
  center: LatLng;
  candidates: NearbyAddress[];
  fallbackAddress?: string;
  onResolved: (address: string) => void;
  onError: (message: string) => void;
}) {
  const { geocodingStatus, reverseGeocode } = useMapCamera();

  useEffect(() => {
    if (!enabled || geocodingStatus === "loading") return;

    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          if (geocodingStatus === "unavailable") {
            throw new Error("Address lookup is unavailable.");
          }
          const address = await reverseGeocode(center);
          if (!active) return;
          onResolved(address);
          onError("");
        } catch (error) {
          if (!active) return;
          const nearest = findNearestAddress(center, candidates);
          if (nearest) onResolved(nearest);
          else if (fallbackAddress) onResolved(fallbackAddress);
          const reason =
            error instanceof Error ? error.message : "Address lookup failed.";
          onError(
            `${reason} ${nearest || fallbackAddress ? "Showing the nearest known address." : "The nearby address could not be determined."}`,
          );
        }
      })();
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    center,
    candidates,
    enabled,
    fallbackAddress,
    geocodingStatus,
    onError,
    onResolved,
    reverseGeocode,
  ]);

  return null;
}

function findNearestAddress(
  center: LatLng,
  candidates: NearbyAddress[],
): string | undefined {
  let nearest: NearbyAddress | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = distanceBetween(center, candidate);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearest?.address;
}

function distanceBetween(first: LatLng, second: LatLng): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.lat - first.lat);
  const longitudeDelta = radians(second.lng - first.lng);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.lat)) *
      Math.cos(radians(second.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function accuracyToneClass(tone: "good" | "fair" | "poor"): string {
  if (tone === "good") return "bg-selected text-primary";
  if (tone === "fair") return "bg-attention text-warning";
  return "bg-error-tint text-error";
}
