import { LocateFixed, Plus } from "lucide-react";
import { useEffect } from "react";
import { useCurrentPosition } from "@frontend/lib/useCurrentPosition.ts";
import { MapLegend } from "@frontend/components/map/MapLegend.tsx";
import { useMapCamera } from "@frontend/components/map/useMapCamera.ts";

/**
 * Controls rendered above the map. The parent must render this inside MapView
 * so the camera context is available.
 */
export function MapOverlays() {
  const { panTo } = useMapCamera();
  const { locate, status, position } = useCurrentPosition();

  /** Re-centers the map whenever the browser returns a new position. */
  useEffect(() => {
    if (position) panTo(position);
  }, [panTo, position]);

  const locationMessage =
    status === "denied"
      ? "Location access was denied. Enable it in your browser settings to find your position."
      : status === "error"
        ? "Your location could not be found. Please try again."
        : null;

  return (
    <div className="pointer-events-none flex h-full flex-col justify-end">
      <div className="my-3 flex w-full items-end justify-between">
        <MapLegend />

        <div className="mr-[19.85px] flex flex-col items-end">
          {/* Location button - focuses on user's location */}
          <button
            className="pointer-events-auto flex self-end h-12 w-12 p-3.25 mt-[19.85px] justify-center items-center bg-surface rounded-pill border-line-subtle hover:bg-pressed active:bg-selected disabled:border-line-subtle shadow-1"
            type="button"
            aria-label="Find my location"
            aria-busy={status === "requesting"}
            disabled={status === "requesting"}
            onClick={locate}
          >
            <LocateFixed className="w-5.5 h-5.5 text-primary disabled:text-disabled" aria-hidden="true" />
          </button>

          {/* Location error messages have been added just because. Needs a design (?) */}
          {locationMessage && (
            <output aria-live="polite">{locationMessage}</output>
          )}

          {/* Add Record (+) Button */}
          <button
            className="pointer-events-auto mt-3 flex h-12 w-12 items-center justify-center self-end rounded-pill border-primary bg-primary text-primary hover:bg-(--color-primary-hover) active:bg-(--color-primary-pressed)"
            type="button"
            aria-label="Add record"
          >
            <Plus className="h-5 w-5 text-(--bg-surface)" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}