import { useEffect, useRef, useState } from "react";
import { FullScreen } from "@frontend/components/records/location/FullScreen.tsx";
import {
  BackIcon,
  CloseIcon,
  SearchIcon,
} from "@frontend/components/records/location/icons.tsx";

type Props = {
  /** The address already on the form, if any. */
  initialAddress: string;
  onSubmit: (address: string) => void;
  onPlacePinInstead: () => void;
  /** Back / Escape: return to the form without changes. */
  onBack: () => void;
};

export function AddressEntryScreen({
  initialAddress,
  onSubmit,
  onPlacePinInstead,
  onBack,
}: Props) {
  const [address, setAddress] = useState(initialAddress);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = address.trim();

  return (
    <FullScreen label="Enter an address">
      <div
        className="flex min-h-0 flex-1 flex-col"
        onKeyDown={(event) => {
          if (event.key === "Escape") onBack();
        }}
      >
        <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-divider px-4">
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="absolute left-2 flex size-11 items-center justify-center text-heading"
          >
            <BackIcon />
          </button>
          <h1 className="text-[18px] font-bold text-heading">New record</h1>
        </header>

        <div className="border-b border-divider bg-[#f2f2ee] px-4 py-3">
          <h2 className="font-serif text-[17px] font-semibold text-heading">
            Location
          </h2>
        </div>

        <form
          className="flex-1 space-y-3 overflow-y-auto p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed) onSubmit(trimmed);
          }}
        >
          <label
            htmlFor="address-entry"
            className="block text-[14px] font-semibold text-heading"
          >
            Address<span className="text-error">*</span>
          </label>

          <div className="flex min-h-11 items-center gap-2 rounded-[8px] border-2 border-primary bg-surface px-3">
            <SearchIcon className="shrink-0 text-body" />
            <input
              ref={inputRef}
              id="address-entry"
              type="text"
              autoComplete="off"
              enterKeyHint="done"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Start typing an addre..."
              className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-heading outline-none placeholder:text-body-muted"
            />
            {address && (
              <button
                type="button"
                aria-label="Clear address"
                onClick={() => {
                  setAddress("");
                  inputRef.current?.focus();
                }}
                className="flex size-8 shrink-0 items-center justify-center text-body"
              >
                <CloseIcon className="size-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!trimmed}
            className="h-12 w-full rounded-full bg-primary text-[15px] font-semibold text-white disabled:bg-divider disabled:text-disabled"
          >
            Use this address
          </button>

          <p className="text-[13px] text-body-muted">
            Can&apos;t find it?{" "}
            <button
              type="button"
              onClick={onPlacePinInstead}
              className="text-primary underline"
            >
              Place a pin on the map instead
            </button>
          </p>
        </form>
      </div>
    </FullScreen>
  );
}
