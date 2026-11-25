import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PinPlacement } from "@frontend/components/records/location/PinPlacement.tsx";

vi.mock("@frontend/components/map/MapView.tsx", async () => {
  const { MapView } = await import("@frontend/components/map/testing.ts");
  return { MapView };
});

const originalGeolocation = navigator.geolocation;

afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: originalGeolocation,
  });
});

function renderPinPlacement(
  props: Partial<React.ComponentProps<typeof PinPlacement>> = {},
) {
  const onBack = vi.fn<() => void>();
  const onUseSpot =
    vi.fn<React.ComponentProps<typeof PinPlacement>["onUseSpot"]>();
  render(
    <PinPlacement
      address="62 Phila St"
      city="Saratoga Springs"
      state="NY"
      initialCenter={{ lat: 43.082886, lng: -73.784522 }}
      onBack={onBack}
      onUseSpot={onUseSpot}
      {...props}
    />,
  );
  return { onBack, onUseSpot };
}

describe("PinPlacement", () => {
  it.each(["requested", "possible"] as const)(
    "shows the %s status pin at the map center",
    (status) => {
      renderPinPlacement({ status });

      expect(
        screen.getByRole("img", { name: `${status} status, selected` }),
      ).toBeInTheDocument();
    },
  );

  it("shows the address, live coordinates, and confirms the selected spot", () => {
    const { onUseSpot } = renderPinPlacement();

    expect(
      screen.getByRole("heading", { name: "Place pin" }),
    ).toBeInTheDocument();
    expect(screen.getByText("62 Phila St")).toBeInTheDocument();
    expect(screen.getByText("43.082886, -73.784522")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use this spot" }));

    expect(onUseSpot).toHaveBeenCalledWith({
      lat: 43.082886,
      lng: -73.784522,
      accuracyMeters: null,
    });
  });

  it("centers on the current location and shows good GPS accuracy", () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: {
              latitude: 43.09,
              longitude: -73.79,
              accuracy: 3.65,
            },
          } as GeolocationPosition);
        },
      },
    });
    const { onUseSpot } = renderPinPlacement();

    fireEvent.click(
      screen.getByRole("button", { name: "Center map on my location" }),
    );

    expect(screen.getByText("43.090000, -73.790000")).toBeInTheDocument();
    expect(screen.getByText("12 ft · Good")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use this spot" }));
    expect(onUseSpot).toHaveBeenCalledWith({
      lat: 43.09,
      lng: -73.79,
      accuracyMeters: 3.65,
    });
  });

  it.each([
    [4, "13 ft · Good"],
    [9, "30 ft · Fair"],
    [11, "36 ft · Poor"],
  ])("labels GPS accuracy for %s meters", (accuracyMeters, label) => {
    renderPinPlacement({ initialAccuracyMeters: accuracyMeters });

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(Boolean(screen.queryByText(/GPS accuracy is low/))).toBe(
      label.includes("Poor"),
    );
  });

  it("reports failed address lookup and allows manual map selection", () => {
    renderPinPlacement({ initialCenter: undefined });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Address lookup is unavailable",
    );
    expect(screen.getByRole("button", { name: "Use this spot" })).toBeEnabled();
  });

  it("reports denied location access", () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: PositionCallback,
          failure?: PositionErrorCallback | null,
        ) => {
          failure?.({
            code: 1,
            message: "Permission denied",
          } as GeolocationPositionError);
        },
      },
    });
    renderPinPlacement();
    fireEvent.click(
      screen.getByRole("button", { name: "Center map on my location" }),
    );

    expect(screen.getByText(/Location access was denied/)).toHaveTextContent(
      "Location access was denied",
    );
  });

  it("returns without confirming when the back button is selected", () => {
    const { onBack, onUseSpot } = renderPinPlacement();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(onUseSpot).not.toHaveBeenCalled();
  });
});
