import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddressSearch } from "@frontend/components/records/location/AddressSearch.tsx";
import type {
  AddressSearchSelection,
  AddressSuggestion,
} from "@frontend/components/records/location/AddressSearch.tsx";

afterEach(cleanup);

const suggestions: AddressSuggestion[] = [
  {
    address: "62 Phila St",
    city: "Saratoga Springs",
    state: "NY",
    treeCount: 1,
    hasHouseNumber: true,
  },
  {
    address: "Phila St",
    city: "Saratoga Springs",
    state: "NY",
    treeCount: 0,
    hasHouseNumber: false,
  },
];

function renderAddressSearch() {
  const onBack = vi.fn<() => void>();
  const onSelect = vi.fn<(selection: AddressSearchSelection) => void>();
  render(
    <AddressSearch
      suggestions={suggestions}
      onBack={onBack}
      onSelect={onSelect}
    />,
  );
  return { onBack, onSelect };
}

function renderAddressSearchWithInitialQuery(initialQuery: string) {
  const onBack = vi.fn<() => void>();
  const onSelect = vi.fn<(selection: AddressSearchSelection) => void>();
  render(
    <AddressSearch
      suggestions={suggestions}
      initialQuery={initialQuery}
      onBack={onBack}
      onSelect={onSelect}
    />,
  );
  return { onBack, onSelect };
}

describe("AddressSearch", () => {
  it("shows suggestions for an initial query", () => {
    renderAddressSearchWithInitialQuery("62 Phi");

    expect(screen.getByRole("searchbox", { name: /address/i })).toHaveValue(
      "62 Phi",
    );
    expect(screen.getByText("62 Phila St")).toBeInTheDocument();
  });

  it("shows matching addresses and opens the selected address", () => {
    const { onSelect } = renderAddressSearch();
    fireEvent.change(screen.getByRole("searchbox", { name: /address/i }), {
      target: { value: "62 Phi" },
    });

    expect(screen.getByText("62 Phila St")).toBeInTheDocument();
    expect(screen.getByText(/1 tree on record/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /62 Phila St/ }));

    expect(onSelect).toHaveBeenCalledWith({
      kind: "address",
      address: "62 Phila St",
      city: "Saratoga Springs",
      state: "NY",
      treeCount: 1,
      source: "suggestion",
    });
  });

  it("lets a user use a custom address", () => {
    const { onSelect } = renderAddressSearch();
    fireEvent.change(screen.getByRole("searchbox", { name: /address/i }), {
      target: { value: "9 Oak St" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use '9 Oak St'" }));

    expect(onSelect).toHaveBeenCalledWith({
      kind: "address",
      address: "9 Oak St",
      city: "Saratoga Springs",
      state: "NY",
      treeCount: 0,
      source: "typed",
    });
  });

  it("asks for a house number when a street is selected and Escape returns to search", () => {
    const { onSelect } = renderAddressSearch();
    fireEvent.change(screen.getByRole("searchbox", { name: /address/i }), {
      target: { value: "Phila St" },
    });
    fireEvent.click(screen.getByText("Add a house number for an exact spot"));

    expect(
      screen.getByText("Add a house number for an exact spot."),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByRole("searchbox", { name: /address/i })).toHaveValue(
      "Phila St",
    );
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("uses the supplied house number to select a street address", () => {
    const { onSelect } = renderAddressSearch();
    fireEvent.change(screen.getByRole("searchbox", { name: /address/i }), {
      target: { value: "Phila St" },
    });
    fireEvent.click(screen.getByText("Add a house number for an exact spot"));
    fireEvent.change(screen.getByLabelText("House number"), {
      target: { value: "63A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSelect).toHaveBeenCalledWith({
      kind: "address",
      address: "63A Phila St",
      city: "Saratoga Springs",
      state: "NY",
      treeCount: 0,
      source: "typed",
    });
  });

  it("returns to search from the house-number prompt without changing the address", () => {
    const { onBack, onSelect } = renderAddressSearch();
    fireEvent.change(screen.getByRole("searchbox", { name: /address/i }), {
      target: { value: "Phila St" },
    });
    fireEvent.click(screen.getByText("Add a house number for an exact spot"));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("searchbox", { name: /address/i })).toHaveValue(
      "Phila St",
    );
    expect(onBack).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("opens the map-pin flow", () => {
    const { onSelect } = renderAddressSearch();
    fireEvent.click(
      screen.getByRole("button", { name: "Place a pin on the map instead" }),
    );
    expect(onSelect).toHaveBeenCalledWith({ kind: "pin" });
  });

  it("uses the page back action when no street prompt is open", () => {
    const { onBack } = renderAddressSearch();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
