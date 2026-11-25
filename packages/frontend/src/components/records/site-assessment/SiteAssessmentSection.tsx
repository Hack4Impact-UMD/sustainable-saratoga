import type { ReactNode } from "react";
import { fieldGuidance as g } from "../fieldGuidance.ts";
import { FieldLabel } from "../FieldLabel.tsx";
import type {
  Exposure,
  PlacementIfNotInRow,
  SiteAssessmentValue,
  WireConflict,
} from "./types.tsx";

type Props = {
  value: SiteAssessmentValue;
  onChange: (next: SiteAssessmentValue) => void;
  disabled?: boolean;
};

const PLACEMENT_OPTIONS: { value: PlacementIfNotInRow; label: string }[] = [
  { value: "not-applicable", label: "Not applicable" },
  { value: "front-yard", label: "Front yard" },
  { value: "side-yard", label: "Side yard" },
  { value: "back-yard", label: "Back yard" },
];

const EXPOSURE_OPTIONS: { value: Exposure; label: string }[] = [
  { value: "N", label: "North (N)" },
  { value: "NE", label: "Northeast (NE)" },
  { value: "E", label: "East (E)" },
  { value: "SE", label: "Southeast (SE)" },
  { value: "S", label: "South (S)" },
  { value: "SW", label: "Southwest (SW)" },
  { value: "W", label: "West (W)" },
  { value: "NW", label: "Northwest (NW)" },
];

const WIRE_CONFLICT_OPTIONS: {
  value: Exclude<WireConflict, "other">;
  label: string;
}[] = [
  { value: "none", label: "No wires nearby" },
  { value: "clear-as-it-matures", label: "Clear as it matures" },
  { value: "conflict", label: "Wire conflict" },
];

const INPUT_CLASS =
  "min-h-11 w-full rounded-lg border border-divider bg-surface px-3 text-[15px] text-heading placeholder:text-body-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60";

/** Digits and a single decimal point only. */
function sanitizeDecimal(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length ? `${whole}.${rest.join("")}` : whole;
}

function RadioOption({
  name,
  checked,
  disabled,
  onSelect,
  children,
}: {
  name: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-[15px] text-heading">
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="size-5 shrink-0 accent-primary"
      />
      {children}
    </label>
  );
}

/** The Site assessment fields of the new-record form. */
export function SiteAssessmentSection({
  value,
  onChange,
  disabled = false,
}: Props) {
  function update(patch: Partial<SiteAssessmentValue>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-4">
      {/* Tree lawn / right-of-way space */}
      <div className="space-y-2">
        <FieldLabel htmlFor="site-row-space" hint={g.treeLawnRowSpace}>
          Tree lawn / right-of-way space
        </FieldLabel>
        <div className="relative">
          <input
            id="site-row-space"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value.rowSpaceFt}
            disabled={disabled}
            aria-describedby="site-row-space-unit"
            onChange={(event) =>
              update({ rowSpaceFt: sanitizeDecimal(event.target.value) })
            }
            className={`${INPUT_CLASS} pr-10`}
          />
          <span
            id="site-row-space-unit"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[15px] text-body-muted"
          >
            ft
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <FieldLabel id="site-placement-label" hint={g.ifNotInRow}>
          Placement if not in ROW
        </FieldLabel>
        <div role="radiogroup" aria-labelledby="site-placement-label">
          {PLACEMENT_OPTIONS.map(({ value: option, label }) => (
            <RadioOption
              key={option}
              name="site-placement"
              checked={value.placement === option}
              disabled={disabled}
              onSelect={() => update({ placement: option })}
            >
              {label}
            </RadioOption>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="site-exposure" hint={g.exposure}>
          Exposure (energy-savings direction)
        </FieldLabel>
        <select
          id="site-exposure"
          value={value.exposure}
          disabled={disabled}
          onChange={(event) =>
            update({ exposure: event.target.value as Exposure | "" })
          }
          className={INPUT_CLASS}
        >
          <option value="">Select…</option>
          {EXPOSURE_OPTIONS.map(({ value: option, label }) => (
            <option key={option} value={option}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <FieldLabel id="site-wire-conflict-label" hint={g.wireConflict}>
          Wire conflict
        </FieldLabel>
        <div role="radiogroup" aria-labelledby="site-wire-conflict-label">
          {WIRE_CONFLICT_OPTIONS.map(({ value: option, label }) => (
            <RadioOption
              key={option}
              name="site-wire-conflict"
              checked={value.wireConflict === option}
              disabled={disabled}
              onSelect={() => update({ wireConflict: option })}
            >
              {label}
            </RadioOption>
          ))}

          {/* Typing in the box selects "Other" automatically. */}
          <div className="flex min-h-11 items-center gap-3 text-[15px] text-heading">
            <input
              id="site-wire-conflict-other-radio"
              type="radio"
              name="site-wire-conflict"
              checked={value.wireConflict === "other"}
              disabled={disabled}
              onChange={() => update({ wireConflict: "other" })}
              className="size-5 shrink-0 accent-primary"
            />
            <label htmlFor="site-wire-conflict-other-radio">Other:</label>
            <input
              type="text"
              aria-label="Other wire conflict"
              autoComplete="off"
              value={value.wireConflictOther}
              disabled={disabled}
              placeholder="Type a short answer"
              onChange={(event) =>
                update({
                  wireConflict: "other",
                  wireConflictOther: event.target.value,
                })
              }
              className="min-w-0 flex-1 border-b border-divider bg-transparent py-1 text-[15px] text-heading placeholder:text-body-muted focus:border-primary focus:outline-none disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="site-preparation" hint={g.preparationRequired}>
          Preparation required
        </FieldLabel>
        <input
          id="site-preparation"
          type="text"
          autoComplete="off"
          value={value.preparationRequired}
          disabled={disabled}
          onChange={(event) =>
            update({ preparationRequired: event.target.value })
          }
          className={INPUT_CLASS}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="site-notes" hint={g.notes}>
          Next steps / general notes
        </FieldLabel>
        <textarea
          id="site-notes"
          value={value.notes}
          disabled={disabled}
          onChange={(event) => update({ notes: event.target.value })}
          rows={3}
          className="min-h-24 w-full resize-none rounded-lg border border-divider bg-surface p-3 text-[15px] text-heading placeholder:text-body-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
      </div>
    </div>
  );
}