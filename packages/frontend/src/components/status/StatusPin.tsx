import type { TreeStatus } from "@repo/common";

interface StatusPinProps {
  status: TreeStatus;
  /** Width in px; height follows the teardrop's 3:4 proportions. */
  width: number;
  selected?: boolean;
  /** A step not reached yet: white pin with a grey outline and glyph. */
  upcoming?: boolean;
}

const colors: Record<
  TreeStatus,
  { fill: string; edge: string; glyph: string; label: string }
> = {
  requested: {
    fill: "fill-pin-requested",
    edge: "stroke-pin-requested-edge",
    glyph: "text-pin-requested-edge",
    label: "R",
  },
  possible: {
    fill: "fill-pin-possible",
    edge: "stroke-pin-possible-edge",
    glyph: "text-pin-possible-edge",
    label: "P",
  },
  approved: {
    fill: "fill-pin-approved",
    edge: "stroke-pin-approved-edge",
    glyph: "text-pin-approved-edge",
    label: "A",
  },
  planted: {
    fill: "fill-pin-planted",
    edge: "stroke-pin-planted-edge",
    glyph: "text-pin-planted-edge",
    label: "",
  },
};

/** Map-pin shaped status marker: coloured teardrop, white disc, letter/check. */
export function StatusPin({
  status,
  width,
  selected = false,
  upcoming = false,
}: StatusPinProps) {
  const c = colors[status];
  return (
    <svg
      role="img"
      aria-label={`${status} status${selected ? ", selected" : ""}`}
      width={width}
      height={(width * 4) / 3}
      viewBox="0 0 24 32"
      className="shrink-0 overflow-visible drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.3)]"
    >
      <path
        d="M12 1C5.9 1 1 5.9 1 12c0 7.8 11 19 11 19s11-11.2 11-19C23 5.9 18.1 1 12 1Z"
        strokeWidth="1.5"
        className={
          upcoming
            ? "fill-surface stroke-pin-upcoming-edge"
            : `${c.fill} ${c.edge}`
        }
      />
      <circle cx="12" cy="12" r="7" className="fill-surface" />
      <g
        className={upcoming ? "text-pin-upcoming-edge" : c.glyph}
        fill="currentColor"
      >
        {status === "planted" ? (
          <path
            d="M8.6 12.2l2.5 2.5 4.4-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <text
            x="12"
            y="15.6"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fontFamily="inherit"
          >
            {c.label}
          </text>
        )}
      </g>
    </svg>
  );
}
