import { useState } from "react";
import { fieldGuidance as g } from "../fieldGuidance.ts";
import { FieldLabel } from "../FieldLabel.tsx";
import { AddressEntryScreen } from "./AddressEntryScreen.tsx";
import { MapPinIcon, SearchIcon } from "./icons.tsx";
import { PlacePinScreen } from "./PlacePinScreen.tsx";
import type { LocationValue } from "./types.ts";

type Props = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  /** Locks every field, e.g. while the record is being created. */
  disabled?: boolean;
};

type Screen = "form" | "address" | "pin";

export function LocationSection({ value, onChange, disabled = false }: Props) {
  const [screen, setScreen] = useState<Screen>("form");

  function handleAddressSubmit(address: string) {
    // A different address clears any pin that was placed for the old one.
    if (address !== value.address) {
      onChange({ ...value, address, pin: null });
    }
    setScreen("form");
  }

  return (
    <div className="space-y-4">
      {/* Address: opens the address entry page */}
      <div className="space-y-2">
        <FieldLabel htmlFor="location-address" required hint={g.address}>
          Address
        </FieldLabel>

        <button
          id="location-address"
          type="button"
          disabled={disabled}
          onClick={() => setScreen("address")}
          className="flex min-h-11 w-full items-center gap-2 rounded-[8px] border border-divider bg-surface px-3 text-left text-[15px] disabled:opacity-60"
        >
          {!value.address && <SearchIcon className="shrink-0 text-body" />}
          <span
            className={`truncate ${value.address ? "text-heading" : "text-body-muted"}`}
          >
            {value.address || "Start typing an address"}
          </span>
        </button>
      </div>

      {/* No pin yet: opens the Place pin page */}
      <div className="flex h-36 flex-col items-center justify-center gap-3 rounded-[8px] bg-[#eceee9]">
        <span className="rounded-md bg-surface px-3 py-1 text-[14px] text-heading">
          {value.address ? "Pin the exact planting spot" : "No pin yet"}
        </span>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setScreen("pin")}
          className="flex h-9 items-center gap-1.5 rounded-full border border-primary bg-surface px-4 text-[14px] font-semibold text-primary disabled:opacity-60"
        >
          <MapPinIcon className="size-4" />
          Place pin on map
        </button>
      </div>

      {/* Location description & landmarks */}
      <div className="space-y-2">
        <FieldLabel htmlFor="location-description" hint={g.locationDescription}>
          Location description &amp; landmarks
        </FieldLabel>
        <textarea
          id="location-description"
          value={value.description}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, description: event.target.value })
          }
          rows={3}
          placeholder="e.g. Tree lawn, right of the front walk"
          className="min-h-24 w-full resize-none rounded-[8px] border border-divider bg-surface p-3 text-[15px] text-heading placeholder:text-body-muted disabled:opacity-60"
        />
      </div>

      {/* DPW or private */}
      <div className="space-y-2">
        <FieldLabel htmlFor="location-ownership" hint={g.ownership}>
          DPW or private
        </FieldLabel>

        <div id="location-ownership" className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "dpw", label: "DPW-controlled" },
              { value: "private", label: "Private" },
            ] as const
          ).map(({ value: option, label }) => (
            <button
              key={option}
              type="button"
              aria-pressed={value.ownership === option}
              disabled={disabled}
              onClick={() => onChange({ ...value, ownership: option })}
              className={`min-h-11 rounded-md border px-3 text-[15px] font-semibold disabled:opacity-60 ${
                value.ownership === option
                  ? "border-primary bg-primary/10 text-heading"
                  : "border-divider bg-surface text-body"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {screen === "address" && (
        <AddressEntryScreen
          initialAddress={value.address}
          onSubmit={handleAddressSubmit}
          onPlacePinInstead={() => setScreen("pin")}
          onBack={() => setScreen("form")}
        />
      )}

      {screen === "pin" && (
        <PlacePinScreen
          address={value.address}
          onBack={() => setScreen("form")}
        />
      )}
    </div>
  );
}