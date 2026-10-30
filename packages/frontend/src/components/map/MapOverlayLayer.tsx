import type { ReactNode } from "react";

/**
 * Covers the map so overlays position against it. Empty space passes taps
 * and drags through to the map; each direct child stays interactive.
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
