import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, LocateFixed, MapPin, Search, X } from "lucide-react";

export interface AddressSuggestion {
  address: string;
  city: string;
  state: string;
  treeCount: number;
  hasHouseNumber: boolean;
}

export type AddressSearchSelection =
  | {
      kind: "address";
      address: string;
      city: string;
      state: string;
      treeCount: number;
      source: "suggestion" | "typed";
    }
  | { kind: "current-location"; latitude: number; longitude: number }
  | { kind: "pin" };

interface AddressSearchProps {
  suggestions: AddressSuggestion[];
  initialQuery?: string;
  onBack: () => void;
  onSelect: (selection: AddressSearchSelection) => void;
}

/** Address entry screen for starting a new tree record. */
export function AddressSearch({
  suggestions,
  initialQuery = "",
  onBack,
  onSelect,
}: AddressSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [streetToComplete, setStreetToComplete] =
    useState<AddressSuggestion | null>(null);
  const [houseNumber, setHouseNumber] = useState("");
  const [locationError, setLocationError] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const matchingSuggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];
    return suggestions.filter((suggestion) =>
      suggestion.address.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query, suggestions]);

  useEffect(() => {
    if (!streetToComplete) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setStreetToComplete(null);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [streetToComplete]);

  function selectSuggestion(suggestion: AddressSuggestion) {
    if (!suggestion.hasHouseNumber) {
      setStreetToComplete(suggestion);
      setHouseNumber("");
      return;
    }
    onSelect({
      kind: "address",
      address: suggestion.address,
      city: suggestion.city,
      state: suggestion.state,
      treeCount: suggestion.treeCount,
      source: "suggestion",
    });
  }

  function useTypedAddress() {
    const address = query.trim();
    if (!address) return;

    const matchingStreet = matchingSuggestions.find(
      (suggestion) =>
        !suggestion.hasHouseNumber &&
        suggestion.address.toLocaleLowerCase() === address.toLocaleLowerCase(),
    );
    if (matchingStreet) {
      selectSuggestion(matchingStreet);
      return;
    }
    onSelect({
      kind: "address",
      address,
      city: "Saratoga Springs",
      state: "NY",
      treeCount: 0,
      source: "typed",
    });
  }

  function useCurrentLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location access isn’t available on this device.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        onSelect({
          kind: "current-location",
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      },
      () => {
        setIsLocating(false);
        setLocationError(
          "Couldn’t get your location. Check your location settings and try again.",
        );
      },
    );
  }

  const goBack = () => {
    if (streetToComplete) {
      setStreetToComplete(null);
      setHouseNumber("");
      return;
    }
    onBack();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-divider px-4">
        <button
          type="button"
          aria-label="Back"
          onClick={goBack}
          className="absolute left-2 grid size-11 place-items-center text-icon-primary"
        >
          <ChevronLeft aria-hidden="true" className="size-6" />
        </button>
        <h1 className="type-h2 font-display text-heading">
          New record
        </h1>
      </header>

      <h2 className="type-h2 flex h-[57px] shrink-0 items-center border-b border-divider bg-pressed px-5">
        Location
      </h2>

      <main className="mx-auto w-full max-w-xl flex-1 px-5 pt-4">
        {streetToComplete ? (
          <section
            aria-label="Add a house number"
            className="flex flex-col gap-3"
          >
            <p className="type-body-strong text-heading">
              {streetToComplete.address}
            </p>
            <p className="type-body-sm text-body-muted">
              Add a house number for an exact spot.
            </p>
            <label htmlFor="house-number" className="type-h4 text-heading">
              House number
            </label>
            <input
              id="house-number"
              inputMode="numeric"
              value={houseNumber}
              onChange={(event) => setHouseNumber(event.target.value)}
              className="h-control w-full rounded-input border border-line-strong bg-surface px-3 text-body outline-none focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus"
            />
            <button
              type="button"
              disabled={!houseNumber.trim()}
              onClick={() =>
                onSelect({
                  kind: "address",
                  address: `${houseNumber.trim()} ${streetToComplete.address}`,
                  city: streetToComplete.city,
                  state: streetToComplete.state,
                  treeCount: 0,
                  source: "typed",
                })
              }
              className="type-btn-primary mt-1 min-h-touch rounded-pill bg-primary px-5 disabled:cursor-not-allowed disabled:bg-disabled-fill"
            >
              Continue
            </button>
          </section>
        ) : (
          <>
            <label
              htmlFor="address-search"
              className="type-h4 mb-1.5 block text-heading"
            >
              Address<span className="text-error">*</span>
            </label>
            <div className="flex h-[52px] items-center gap-2 rounded-input border-2 border-focus bg-surface px-3 shadow-field-focus">
              <Search
                aria-hidden="true"
                className="size-6 shrink-0 text-icon-primary"
              />
              <input
                id="address-search"
                type="text"
                role="searchbox"
                autoComplete="street-address"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Saratoga Springs addresses"
                className="type-body h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-body outline-none placeholder:text-body-muted"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear address"
                  onClick={() => setQuery("")}
                  className="grid size-9 shrink-0 place-items-center text-icon-primary"
                >
                  <X aria-hidden="true" className="size-6" />
                </button>
              )}
            </div>

            {query.trim() && (
              <div className="mt-4 overflow-hidden rounded-md border border-divider bg-surface shadow-1">
                {matchingSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.address}-${suggestion.city}`}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="flex min-h-[76px] w-full items-center gap-4 px-4 py-3 text-left hover:bg-hover focus-visible:bg-hover"
                  >
                    <MapPin
                      aria-hidden="true"
                      className="size-6 shrink-0 text-primary"
                    />
                    <span className="min-w-0">
                      <span className="type-body-strong block text-heading">
                        {suggestion.address}
                      </span>
                      {suggestion.hasHouseNumber ? (
                        <span className="type-body-sm block text-body-muted underline underline-offset-2">
                          {suggestion.city}, {suggestion.state} ·{" "}
                          {suggestion.treeCount}{" "}
                          {suggestion.treeCount === 1 ? "tree" : "trees"} on
                          record
                        </span>
                      ) : (
                        <span className="type-body-sm block text-body-muted">
                          Add a house number for an exact spot
                        </span>
                      )}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={useTypedAddress}
                  className="type-body-strong flex min-h-touch w-full items-center gap-4 border-t border-divider px-4 py-3 text-left text-primary hover:bg-hover"
                >
                  <Search aria-hidden="true" className="size-6 shrink-0" />
                  <span>Use &apos;{query.trim()}&apos;</span>
                </button>

                <button
                  type="button"
                  disabled={isLocating}
                  onClick={useCurrentLocation}
                  className="type-body-strong flex min-h-touch w-full items-center gap-4 border-t border-divider px-4 py-3 text-left text-primary hover:bg-hover disabled:opacity-60"
                >
                  <LocateFixed aria-hidden="true" className="size-6 shrink-0" />
                  <span>
                    {isLocating
                      ? "Getting your location…"
                      : "Use my current location"}
                  </span>
                </button>
              </div>
            )}

            {locationError && (
              <p role="alert" className="type-body-sm mt-2 text-error">
                {locationError}
              </p>
            )}

            <p className="type-body-sm mt-5 text-body-muted">
              Can’t find it?{" "}
              <button
                type="button"
                onClick={() => onSelect({ kind: "pin" })}
                className="text-primary underline underline-offset-2"
              >
                Place a pin on the map instead
              </button>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
