import { fieldGuidance as g } from "../fieldGuidance.ts";
import { FieldLabel } from "../FieldLabel.tsx";
import type { EventPlantingValue } from "./types.ts";

type Props = {
  value: EventPlantingValue;
  onChange: (next: EventPlantingValue) => void;
  disabled?: boolean;
};

const INPUT_CLASS =
  "h-11 min-h-11 w-full rounded-lg border border-divider bg-surface px-3 text-[15px] text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60";

export function EventPlantingSection({
  value,
  onChange,
  disabled = false,
}: Props) {
  function update(patch: Partial<EventPlantingValue>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-4">
      {/* Event and event year */}
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <FieldLabel htmlFor="event-planting-event" hint={g.event}>
            Event
          </FieldLabel>
          <select
            id="event-planting-event"
            value={value.event}
            onChange={(event) => update({ event: event.target.value })}
            disabled={disabled}
            className={INPUT_CLASS}
          >
            <option value="">Select event</option>
          </select>
        </div>

        <div className="min-w-0 space-y-2">
          <FieldLabel htmlFor="event-planting-year" hint={g.eventYear}>
            Event year
          </FieldLabel>
          <select
            id="event-planting-year"
            value={value.eventYear}
            onChange={(event) => update({ eventYear: event.target.value })}
            disabled={disabled}
            className={INPUT_CLASS}
          >
            <option value="">Select year</option>
          </select>
        </div>
      </div>

      {/* Tree Toga number */}
      <div className="space-y-2">
        <FieldLabel
          htmlFor="event-planting-toga-number"
          hint={g.treeTogaNumber}
        >
          Tree Toga number
        </FieldLabel>
        <input
          id="event-planting-toga-number"
          type="number"
          min="0"
          value={value.treeTogaNumber}
          onChange={(event) => update({ treeTogaNumber: event.target.value })}
          disabled={disabled}
          placeholder="Enter number"
          className={INPUT_CLASS}
        />
      </div>

      {/* Planting date */}
      <div className="space-y-2">
        <FieldLabel htmlFor="event-planting-date" hint={g.plantingDate}>
          Planting date
        </FieldLabel>
        <input
          id="event-planting-date"
          type="date"
          value={value.plantingDate}
          onChange={(event) => update({ plantingDate: event.target.value })}
          disabled={disabled}
          className={`${INPUT_CLASS} cursor-pointer`}
        />
      </div>

      {/* Planted by */}
      <div className="space-y-2">
        <FieldLabel htmlFor="event-planting-planted-by" hint={g.plantedBy}>
          Planted by
        </FieldLabel>
        <input
          id="event-planting-planted-by"
          type="text"
          value={value.plantedBy}
          onChange={(event) => update({ plantedBy: event.target.value })}
          disabled={disabled}
          className={INPUT_CLASS}
          placeholder="e.g. Sustainable Saratoga"
        />
      </div>
    </div>
  );
}