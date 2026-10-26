import type { MapMarker } from "@repo/common";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapView } from "@frontend/components/map/MapView.tsx";
import { MapViewStub } from "@frontend/components/map/MapViewStub.tsx";
import {
  lastStubPanTo,
  resetStubCamera,
} from "@frontend/components/map/stubCamera.ts";
import { useMapCamera } from "@frontend/components/map/useMapCamera.ts";

// Just enough of the SDK to render GoogleMap's layout without loading Google.
vi.mock("@vis.gl/react-google-maps", () => ({
  APILoadingStatus: { FAILED: "FAILED", AUTH_FAILURE: "AUTH_FAILURE" },
  APIProvider: ({ children }: { children: ReactNode }) => children,
  Map: ({
    className,
    children,
  }: {
    className?: string;
    children: ReactNode;
  }) => (
    <div data-testid="map" className={className}>
      {children}
    </div>
  ),
  AdvancedMarker: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  useApiLoadingStatus: () => "LOADED",
  useMap: () => null,
}));

const markers = [
  { id: "tree-1", lat: 43.08, lng: -73.78, status: "planted" },
  { id: "tree-2", lat: 43.09, lng: -73.79, status: "requested" },
] as MapMarker[];

function renderMarker(marker: MapMarker, selected: boolean) {
  return (
    <span data-testid={`pin-${marker.id}`} data-selected={String(selected)} />
  );
}

function PanButton() {
  const { panTo } = useMapCamera();
  return (
    <button type="button" onClick={() => panTo({ lat: 1, lng: 2 }, 17)}>
      Pan
    </button>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  resetStubCamera();
});

describe("MapViewStub", () => {
  it("renders a button per marker", () => {
    render(
      <MapViewStub
        markers={markers}
        onMarkerSelect={vi.fn<(id: string) => void>()}
        renderMarker={renderMarker}
      />,
    );

    expect(screen.getByRole("button", { name: "tree-1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tree-2" })).toBeInTheDocument();
  });

  it("calls onMarkerSelect with the clicked marker's id", () => {
    const onMarkerSelect = vi.fn<(id: string) => void>();
    render(
      <MapViewStub
        markers={markers}
        onMarkerSelect={onMarkerSelect}
        renderMarker={renderMarker}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "tree-2" }));

    expect(onMarkerSelect).toHaveBeenCalledExactlyOnceWith("tree-2");
  });

  it("passes selectedId through to renderMarker", () => {
    render(
      <MapViewStub
        markers={markers}
        selectedId="tree-1"
        onMarkerSelect={vi.fn<(id: string) => void>()}
        renderMarker={renderMarker}
      />,
    );

    expect(screen.getByTestId("pin-tree-1")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(screen.getByTestId("pin-tree-2")).toHaveAttribute(
      "data-selected",
      "false",
    );
  });

  it("gives children a camera that records the last pan", () => {
    render(
      <MapViewStub
        markers={markers}
        onMarkerSelect={vi.fn<(id: string) => void>()}
        renderMarker={renderMarker}
      >
        <PanButton />
      </MapViewStub>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pan" }));

    expect(lastStubPanTo()).toEqual({ pos: { lat: 1, lng: 2 }, zoom: 17 });
  });
});

describe("MapView", () => {
  it("renders the stub when the API key is missing", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    render(
      <MapView
        markers={markers}
        onMarkerSelect={vi.fn<(id: string) => void>()}
        renderMarker={renderMarker}
      />,
    );

    expect(screen.getByTestId("map-stub")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tree-1" })).toBeInTheDocument();
  });

  it("draws overlays in a layer over the map, not below it", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
    vi.stubEnv("VITE_GOOGLE_MAPS_MAP_ID", "test-map-id");
    render(
      <MapView
        markers={markers}
        onMarkerSelect={vi.fn<(id: string) => void>()}
        renderMarker={renderMarker}
      >
        <PanButton />
      </MapView>,
    );

    // jsdom has no layout, so check the structure that keeps overlays
    // inside the map's box: a full-size absolute layer in the same
    // positioned wrapper as the map.
    const map = screen.getByTestId("map");
    const layer = screen.getByTestId("map-overlay");
    expect(map.parentElement).toHaveClass("relative");
    expect(layer.parentElement).toBe(map.parentElement);
    expect(layer).toHaveClass("absolute", "inset-0", "pointer-events-none");
    expect(layer).toContainElement(screen.getByRole("button", { name: "Pan" }));
  });

  it("shows a fallback, not a map, when the Map ID is missing", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
    vi.stubEnv("VITE_GOOGLE_MAPS_MAP_ID", "");
    render(
      <MapView
        markers={markers}
        onMarkerSelect={vi.fn<(id: string) => void>()}
        renderMarker={renderMarker}
      >
        <PanButton />
      </MapView>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "The map couldn't load.",
    );
    expect(screen.queryByTestId("map-stub")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pan" }));
  });
});
