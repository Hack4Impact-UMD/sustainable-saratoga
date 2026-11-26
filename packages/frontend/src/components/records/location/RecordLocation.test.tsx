import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MapMarker } from "@repo/common";
import { RecordLocation } from "@frontend/components/records/location/RecordLocation.tsx";
import type { AddressSuggestion } from "@frontend/components/records/location/AddressSearch.tsx";
import { notify } from "@frontend/lib/notify.tsx";

vi.mock("@frontend/lib/notify.tsx", () => ({
  notify: vi.fn<(variant: "success" | "error", message: string) => void>(),
}));
vi.mock("@frontend/components/map/MapView.tsx", async () => {
  const { MapView } = await import("@frontend/components/map/testing.ts");
  return { MapView };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const suggestions: AddressSuggestion[] = [
  {
    address: "62 Phila St",
    city: "Saratoga Springs",
    state: "NY",
    treeCount: 1,
    hasHouseNumber: true,
    location: { lat: 43.082886, lng: -73.784522 },
  },
];

const backgroundMarkers: MapMarker[] = [
  {
    id: "possible-tree",
    lat: 43.0829,
    lng: -73.7845,
    address: "63 Phila St",
    treeNumber: 1,
    treeCount: 1,
    recordType: "planting",
    status: "possible",
    seasonYear: 2026,
    issuedBy: "Sustainable Saratoga",
  },
];

describe("RecordLocation", () => {
  it("opens address search when the address field is activated", () => {
    render(<RecordLocation suggestions={suggestions} />);

    expect(screen.getByLabelText("Address *")).toHaveAttribute(
      "placeholder",
      "Start typing an address",
    );
    fireEvent.click(screen.getByLabelText("Address *"));

    expect(
      screen.getByRole("searchbox", { name: /address/i }),
    ).toBeInTheDocument();
  });

  it("returns from pin placement with the selected address and existing-tree notice", () => {
    render(<RecordLocation suggestions={suggestions} />);
    fireEvent.click(screen.getByLabelText("Address *"));
    fireEvent.change(screen.getByRole("searchbox", { name: /address/i }), {
      target: { value: "62 Phi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /62 Phila St/ }));

    expect(
      screen.getByRole("heading", { name: "Place pin" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByLabelText("Address *")).toHaveValue(
      "62 Phila St, Saratoga Springs, NY",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 tree already at this address",
    );
    expect(screen.getByText(/Tree #2/)).toBeInTheDocument();
    expect(screen.getByLabelText("Pin the exact planting spot")).toBeVisible();
    expect(screen.getByLabelText("Pin the exact planting spot").tagName).toBe(
      "BUTTON",
    );
  });

  it("shows a no-pin placeholder before an address is selected", () => {
    render(<RecordLocation suggestions={suggestions} />);

    expect(screen.getByLabelText("No pin placed yet")).toBeVisible();
    expect(screen.getByText("No pin yet")).toBeInTheDocument();
  });

  it("opens map placement from the full placeholder and fills the nearest address", async () => {
    render(
      <RecordLocation
        suggestions={suggestions}
        backgroundMarkers={backgroundMarkers}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "No pin placed yet" }));

    expect(
      screen.getByText("Drag the map — the pin stays in the middle"),
    ).toBeInTheDocument();
    await screen.findByText("Near to 63 Phila St", {}, { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: "Use this spot" }));

    await waitFor(
      () => {
        expect(screen.getByLabelText("Address *")).toHaveValue(
          "63 Phila St, Saratoga Springs, NY",
        );
      },
      { timeout: 3000 },
    );
    expect(screen.getByLabelText("Saved pin map preview")).toBeVisible();
    expect(notify).toHaveBeenCalledWith("success", "Pin placed");
  });

  it("fills the address after selecting Place a pin on the map instead", async () => {
    render(
      <RecordLocation
        suggestions={suggestions}
        backgroundMarkers={backgroundMarkers}
      />,
    );
    fireEvent.click(screen.getByLabelText("Address *"));
    fireEvent.change(screen.getByRole("searchbox", { name: /address/i }), {
      target: { value: "unknown" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Place a pin on the map instead" }),
    );

    expect(
      screen.getByText("Drag the map — the pin stays in the middle"),
    ).toBeInTheDocument();
    await screen.findByText("Near to 63 Phila St", {}, { timeout: 2000 });
    fireEvent.click(screen.getByRole("button", { name: "Use this spot" }));

    await waitFor(
      () => {
        expect(screen.getByLabelText("Address *")).toHaveValue(
          "63 Phila St, Saratoga Springs, NY",
        );
      },
      { timeout: 3000 },
    );
    expect(screen.getByLabelText("Saved pin map preview")).toBeVisible();
    expect(notify).toHaveBeenCalledWith("success", "Pin placed");
  });

  it("returns after saving and shows a centered pin with faded nearby pins", () => {
    vi.useFakeTimers();
    render(
      <RecordLocation
        suggestions={suggestions}
        backgroundMarkers={backgroundMarkers}
      />,
    );
    fireEvent.click(screen.getByLabelText("Address *"));
    fireEvent.change(screen.getByRole("searchbox", { name: /address/i }), {
      target: { value: "62 Phi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /62 Phila St/ }));
    fireEvent.click(screen.getByRole("button", { name: "Use this spot" }));

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    act(() => vi.advanceTimersByTime(450));
    expect(screen.getByRole("button", { name: "Saved" })).toBeDisabled();
    act(() => vi.advanceTimersByTime(450));

    expect(screen.getByLabelText("Saved pin map preview")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "requested status, selected" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "possible status" }).parentElement,
    ).toHaveClass("opacity-60");
    expect(screen.getByRole("button", { name: "Move pin" })).toBeEnabled();
    expect(screen.getByLabelText("Saved pin map preview")).toHaveClass(
      "aspect-[2/1]",
    );
    expect(notify).toHaveBeenCalledWith("success", "Pin placed");

    fireEvent.click(screen.getByRole("button", { name: "Move pin" }));
    expect(
      screen.getByText("Drag the map — the pin stays in the middle"),
    ).toBeInTheDocument();
    expect(screen.getByText("Near to 62 Phila St")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Saved pin map preview")).toBeVisible();
  });
});
