import type { ReactNode } from "react";

/**
 * Covers the map so overlays position against it. Taps and drags pass through
 * to the map; each control opts back in with `pointer-events-auto`.
 */
export function MapOverlayLayer({ children }: { children?: ReactNode }) {
  return (
    <div
      data-testid="map-overlay"
      className="pointer-events-none absolute inset-0"
    >
      {children}
    </div>
  );
}
