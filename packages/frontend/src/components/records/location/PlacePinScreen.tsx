import { FullScreen } from "./FullScreen.tsx";
import { BackIcon, MapPinIcon } from "./icons.tsx";
import { splitAddress } from "./types.ts";

type Props = {
  address: string;
  onBack: () => void;
};

/* The real map isn't built yet, so this page is a placeholder in its place so when a map*/
export function PlacePinScreen({ address, onBack }: Props) {
  const { street, locality } = splitAddress(address);

  return (
    <FullScreen label="Place pin">
      <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-divider px-4">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="absolute left-2 flex size-11 items-center justify-center text-heading"
        >
          <BackIcon />
        </button>
        <h1 className="text-[18px] font-bold text-heading">Place pin</h1>
      </header>

      {/* Map placeholder */}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#e4e6df] p-6">
        <div className="space-y-2 rounded-xl bg-surface p-5 text-center">
          <MapPinIcon className="mx-auto size-8 text-primary" />
          <p className="text-[16px] font-semibold text-heading">
            Map coming soon
          </p>
          <p className="text-[14px] text-body-muted">
            Set up for dragging points to location
          </p>
        </div>
      </div>

      <div className="shrink-0 rounded-t-2xl bg-surface p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        {address ? (
          <>
            <p className="text-[13px] text-body-muted">Planting spot at</p>
            <p className="text-[16px] font-semibold text-heading">{street}</p>
            {locality && (
              <p className="text-[14px] text-body-muted">{locality}</p>
            )}
          </>
        ) : (
          <p className="text-[14px] text-body-muted">No address entered yet.</p>
        )}

        <button
          type="button"
          disabled
          className="mt-4 h-12 w-full rounded-full bg-divider text-[15px] font-semibold text-disabled"
        >
          Use this spot
        </button>
      </div>
    </FullScreen>
  );
}