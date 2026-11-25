import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { InfoIcon } from "./location/icons.tsx";

type Props = {
  /** The input this label names. Omit for a group of buttons (use `id`). */
  htmlFor?: string;
  /** Id for `aria-labelledby` on a group. */
  id?: string;
  /** Adds a red asterisk. */
  required?: boolean;
  /** Shows an info icon that opens a bubble with this text. Omit for no icon. */
  hint?: string;
  children: ReactNode;
};

const LABEL_CLASS = "text-[14px] font-semibold text-heading";
const BUBBLE_MAX_WIDTH = 320;

// Inline on purpose: the app's Tailwind theme doesn't generate every default
// utility (e.g. text-white, rounded-2xl), which left the bubble unstyled.
const BUBBLE_STYLE: CSSProperties = {
  position: "fixed",
  zIndex: 60,
  width: "max-content",
  boxSizing: "border-box",
  padding: "8px 12px",
  borderRadius: 12,
  backgroundColor: "#292929",
  color: "#ffffff",
  fontSize: 13,
  lineHeight: "18px",
  fontWeight: 400,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
};
const EDGE_GAP = 16;
const ANCHOR_GAP = 8;

type Coords = { top: number; left: number };

export function FieldLabel({ htmlFor, id, required, hint, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const bubbleId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
    setCoords(null);
  }, []);

  // Puts the bubble under the icon, or above it when there isn't room below,
  // and keeps it inside the screen horizontally.
  const place = useCallback(() => {
    const button = buttonRef.current;
    const bubble = bubbleRef.current;
    if (!button || !bubble) return;

    const rect = button.getBoundingClientRect();
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;

    const left = Math.min(
      Math.max(EDGE_GAP, rect.left - 12),
      Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP),
    );

    const below = rect.bottom + ANCHOR_GAP;
    const fitsBelow = below + height <= window.innerHeight - EDGE_GAP;
    const top = fitsBelow
      ? below
      : Math.max(EDGE_GAP, rect.top - ANCHOR_GAP - height);

    setCoords({ top, left });
  }, []);

  // Runs before the browser paints, so the bubble never flashes in the wrong
  // spot. It first renders hidden so its size can be measured.
  useLayoutEffect(() => {
    if (isOpen) place();
  }, [isOpen, place]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      // The icon's own click handles closing.
      if (buttonRef.current?.contains(event.target as Node)) return;
      close();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [isOpen, place, close]);

  const content = (
    <>
      {children}
      {required && <span className="text-error"> *</span>}
    </>
  );

  return (
    <div className="flex items-center gap-1.5">
      {htmlFor ? (
        <label id={id} htmlFor={htmlFor} className={LABEL_CLASS}>
          {content}
        </label>
      ) : (
        <span id={id} className={LABEL_CLASS}>
          {content}
        </span>
      )}

      {hint && (
        <button
          ref={buttonRef}
          type="button"
          aria-label="More info"
          aria-expanded={isOpen}
          aria-controls={isOpen ? bubbleId : undefined}
          onClick={() => (isOpen ? close() : setIsOpen(true))}
          className="-m-1.5 flex items-center justify-center p-1.5 text-body-muted"
        >
          <InfoIcon className="size-[18px]" />
        </button>
      )}

      {isOpen &&
        hint &&
        createPortal(
          <div
            ref={bubbleRef}
            id={bubbleId}
            role="tooltip"
            style={{
              ...BUBBLE_STYLE,
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              maxWidth: Math.min(
                BUBBLE_MAX_WIDTH,
                window.innerWidth - EDGE_GAP * 2,
              ),
              visibility: coords ? "visible" : "hidden",
            }}
          >
            {hint}
          </div>,
          document.body,
        )}
    </div>
  );
}