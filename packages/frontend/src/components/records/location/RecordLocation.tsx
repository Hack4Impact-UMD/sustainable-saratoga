import { useCallback, useState } from "react";
import type { MapMarker } from "@repo/common";
import type {
  AddressSearchSelection,
  AddressSuggestion,
} from "@frontend/components/records/location/AddressSearch.tsx";
import { AddressSearch } from "@frontend/components/records/location/AddressSearch.tsx";
import { PinPlacement } from "@frontend/components/records/location/PinPlacement.tsx";
import type { PinPlacementResult } from "@frontend/components/records/location/PinPlacement.tsx";
import { MapView } from "@frontend/components/map/MapView.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@frontend/components/ui/popover.tsx";
import { fieldGuidance } from "@frontend/components/records/fieldGuidance.ts";
import { StatusPin } from "@frontend/components/status/StatusPin.tsx";
import { notify } from "@frontend/lib/notify.tsx";
import { Info, MapPin, Move, Search } from "lucide-react";

type LocationStep = "form" | "search" | "pin" | "move-pin" | "map-pin";

interface RecordLocationProps {
  suggestions: AddressSuggestion[];
  backgroundMarkers?: MapMarker[];
}

/** Address field and its search/map-selection flow for the record form. */
export function RecordLocation({
  suggestions,
  backgroundMarkers = [],
}: RecordLocationProps) {
  const [step, setStep] = useState<LocationStep>("form");
  const [selection, setSelection] = useState<AddressSearchSelection | null>(
    null,
  );
  const [savedPin, setSavedPin] = useState<PinPlacementResult | null>(null);
  const selectedAddress = selection?.kind === "address" ? selection : null;

  const updateSelectionFromNearbyAddress = useCallback(
    (spot: PinPlacementResult) => {
      if (!spot.nearbyAddress) return;
      const matchedSuggestion = suggestions.find(
        (suggestion) =>
          suggestion.address.toLocaleLowerCase() ===
          spot.nearbyAddress?.toLocaleLowerCase(),
      );
      const matchedMarker = backgroundMarkers.find(
        (marker) =>
          marker.address.toLocaleLowerCase() ===
          spot.nearbyAddress?.toLocaleLowerCase(),
      );
      setSelection({
        kind: "address",
        address: spot.nearbyAddress,
        city: matchedSuggestion?.city ?? "Saratoga Springs",
        state: matchedSuggestion?.state ?? "NY",
        treeCount:
          matchedSuggestion?.treeCount ?? matchedMarker?.treeCount ?? 0,
        source: "typed",
        location: { lat: spot.lat, lng: spot.lng },
      });
    },
    [backgroundMarkers, suggestions],
  );

  const handlePinSaved = useCallback((spot: PinPlacementResult) => {
    setSavedPin(spot);
    setStep("form");
    notify("success", "Pin placed");
  }, []);
  const handleMapPinSaved = useCallback(
    (spot: PinPlacementResult) => {
      updateSelectionFromNearbyAddress(spot);
      setSavedPin(spot);
      setStep("form");
      notify("success", "Pin placed");
    },
    [updateSelectionFromNearbyAddress],
  );
  const handlePinMoved = useCallback(
    (spot: PinPlacementResult) => {
      updateSelectionFromNearbyAddress(spot);
      setSavedPin(spot);
      setStep("form");
      notify("success", "Pin moved");
    },
    [updateSelectionFromNearbyAddress],
  );

  if (step === "search") {
    return (
      <AddressSearch
        suggestions={suggestions}
        onBack={() => setStep("form")}
        onSelect={(nextSelection) => {
          setSavedPin(null);
          setSelection(nextSelection);
          setStep("pin");
        }}
      />
    );
  }

  if (step === "pin" || step === "move-pin" || step === "map-pin") {
    const isMoving = step === "move-pin";
    const isMapPlacement =
      step === "map-pin" ||
      selection?.kind === "pin" ||
      selection?.kind === "current-location";
    const nearbyAddresses = [
      ...backgroundMarkers.map(({ address, lat, lng }) => ({
        address,
        lat,
        lng,
      })),
      ...suggestions.flatMap((suggestion) =>
        suggestion.location
          ? [{ address: suggestion.address, ...suggestion.location }]
          : [],
      ),
    ];
    const pinProps =
      selection?.kind === "address"
        ? {
            address: selection.address,
            city: selection.city,
            state: selection.state,
            initialCenter: isMoving
              ? savedPin
                ? { lat: savedPin.lat, lng: savedPin.lng }
                : selection.location
              : selection.location,
          }
        : selection?.kind === "current-location"
          ? {
              initialCenter: { lat: selection.lat, lng: selection.lng },
              initialAccuracyMeters: selection.accuracyMeters,
            }
          : isMapPlacement
            ? { city: "Saratoga Springs", state: "NY" }
            : {};

    return (
      <PinPlacement
        {...pinProps}
        {...(isMoving && savedPin
          ? {
              initialCenter: { lat: savedPin.lat, lng: savedPin.lng },
              initialAccuracyMeters: savedPin.accuracyMeters,
            }
          : {})}
        mode={isMoving ? "move" : isMapPlacement ? "map" : "place"}
        nearbyAddresses={nearbyAddresses}
        onBack={() => setStep("form")}
        onUseSpot={
          isMoving
            ? handlePinMoved
            : isMapPlacement
              ? handleMapPinSaved
              : handlePinSaved
        }
      />
    );
  }

  const formattedAddress = selectedAddress
    ? `${selectedAddress.address}, ${selectedAddress.city}, ${selectedAddress.state}`
    : "";
  const treeCount = selectedAddress?.treeCount ?? 0;
  const savedMarker: MapMarker | null = savedPin
    ? {
        id: "record-location-selected-pin",
        lat: savedPin.lat,
        lng: savedPin.lng,
        address: formattedAddress || "Selected spot",
        treeNumber: treeCount + 1,
        treeCount: treeCount + 1,
        recordType: "planting",
        status: "requested",
        seasonYear: new Date().getFullYear(),
        issuedBy: "Sustainable Saratoga",
      }
    : null;
  const previewMarkers = [
    ...backgroundMarkers.filter((marker) => marker.id !== savedMarker?.id),
    ...(savedMarker ? [savedMarker] : []),
  ];

  return (
    <section className="flex flex-col gap-5 bg-surface px-6 py-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <label htmlFor="record-address" className="type-h4 text-heading">
            Address <span className="text-error">*</span>
          </label>
          <Popover>
            <PopoverTrigger
              aria-label="About Address"
              className="inline-flex size-8 items-center justify-center rounded-pill text-icon-primary outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Info aria-hidden="true" className="size-6" />
            </PopoverTrigger>
            <PopoverContent aria-label="Address">
              {fieldGuidance.address}
            </PopoverContent>
          </Popover>
        </div>
        <div className="relative">
          <Search
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 left-4 size-6 -translate-y-1/2 ${selectedAddress ? "hidden" : "text-icon-primary"}`}
          />
          <input
            id="record-address"
            type="text"
            readOnly
            value={formattedAddress}
            placeholder="Start typing an address"
            onClick={() => setStep("search")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setStep("search");
              }
            }}
            className={`type-body h-[52px] w-full cursor-pointer rounded-input border-2 border-line bg-surface pr-4 text-body outline-none placeholder:text-body-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus ${selectedAddress ? "pl-4" : "pl-12"}`}
          />
        </div>
      </div>

      {selectedAddress && treeCount > 0 && (
        <output className="flex gap-3 rounded-md border border-line-info bg-info-tint p-4 text-info">
          <Info aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          <div className="min-w-0">
            <p className="type-body-strong text-info">
              {treeCount} {treeCount === 1 ? "tree" : "trees"} already at this
              address
            </p>
            <p className="type-body mt-2 text-heading">
              This one will be saved as <strong>Tree #{treeCount + 1}</strong>.
              Check it isn’t the same tree.
            </p>
            <span className="type-body mt-2 inline-block text-info underline underline-offset-2">
              View the existing {treeCount === 1 ? "tree" : "trees"}
            </span>
          </div>
        </output>
      )}

      {savedMarker ? (
        <div
          aria-label="Saved pin map preview"
          className="relative aspect-[2/1] max-h-[320px] w-full overflow-hidden rounded-md border border-line"
        >
          <MapView
            markers={previewMarkers}
            selectedId={savedMarker.id}
            onMarkerSelect={() => {}}
            renderMarker={(marker, isSelected) =>
              isSelected ? (
                <StatusPin status={marker.status} width={36} selected />
              ) : (
                <div className="pointer-events-none opacity-60">
                  <StatusPin status={marker.status} width={26} />
                </div>
              )
            }
            defaultCenter={{ lat: savedMarker.lat, lng: savedMarker.lng }}
            defaultZoom={17}
            interactive={false}
          />
          <button
            type="button"
            onClick={() => setStep("move-pin")}
            className="absolute right-3 bottom-3 inline-flex min-h-touch items-center gap-2 rounded-pill border-2 border-primary bg-surface px-4 text-primary shadow-1"
          >
            <Move aria-hidden="true" className="size-5" />
            Move pin
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setStep("map-pin")}
          aria-label={
            selectedAddress
              ? "Pin the exact planting spot"
              : "No pin placed yet"
          }
          className="flex h-[300px] w-full flex-col items-center justify-center gap-5 rounded-md border border-line bg-divider focus-visible:outline-2 focus-visible:outline-focus"
        >
          <span className="type-body-strong rounded-input bg-surface px-4 py-2 text-heading shadow-1">
            {selectedAddress ? "Pin the exact planting spot" : "No pin yet"}
          </span>
          <span className="type-btn-secondary inline-flex min-h-touch items-center gap-2 rounded-pill border border-primary bg-surface px-5 shadow-1">
            <MapPin aria-hidden="true" className="size-6" />
            Place pin on map
          </span>
        </button>
      )}
    </section>
  );
}
