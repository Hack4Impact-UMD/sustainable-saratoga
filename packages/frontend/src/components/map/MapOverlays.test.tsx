import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapView } from "@frontend/components/map/testing.ts";
import { MapOverlays } from "@frontend/components/map/MapOverlays.tsx";
import {
  lastStubPanTo,
  resetStubCamera,
} from "@frontend/components/map/stubCamera.ts";

afterEach(() => {
  cleanup();
  resetStubCamera();
});

function renderOverlays() {
  render(
    <MapView
      markers={[]}
      onMarkerSelect={vi.fn<(id: string) => void>()}
      renderMarker={() => null}
    >
      <MapOverlays />
    </MapView>,
  );
}

describe("MapOverlays", () => {
  it("renders location and add-record buttons", () => {
    renderOverlays();

    expect(screen.getByTestId("map-overlay").firstElementChild).toHaveClass(
      "pointer-events-none",
    );
    expect(
      screen.getByRole("button", { name: "Find my location" }),
    ).toHaveClass("pointer-events-auto");
    expect(screen.getByRole("button", { name: "Add record" })).toHaveClass(
      "pointer-events-auto",
    );
  });

  it("centers the map after locating the user", () => {
    const getCurrentPosition = (
      success: PositionCallback,
      _error?: PositionErrorCallback | null,
    ) => {
      success({
        coords: { latitude: 43.0831, longitude: -73.7846 },
      } as GeolocationPosition);
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    renderOverlays();
    fireEvent.click(screen.getByRole("button", { name: "Find my location" }));

    expect(lastStubPanTo()).toEqual({
      pos: { lat: 43.0831, lng: -73.7846 },
    });
  });

  it("shows a friendly message when location access is denied", () => {
    const getCurrentPosition = (
      _success: PositionCallback,
      error?: PositionErrorCallback | null,
    ) => {
      error?.({
        code: 1,
        message: "Permission denied",
      } as GeolocationPositionError);
    };
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    renderOverlays();
    fireEvent.click(screen.getByRole("button", { name: "Find my location" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Location access was denied.",
    );
  });
});
