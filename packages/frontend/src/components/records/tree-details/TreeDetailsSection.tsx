
import { fieldGuidance as g } from "../fieldGuidance.ts";
import { FieldLabel } from "../FieldLabel.tsx";
import type { TreeSpeciesValue } from "./types.ts";

type Props = {
  value: TreeSpeciesValue;
  onChange: (next: TreeSpeciesValue) => void;
  disabled?: boolean;
};

const INPUT_CLASS =
  "min-h-11 w-full rounded-lg border border-divider bg-surface px-3 text-[15px] text-heading placeholder:text-body-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60";

export function TreeSpeciesSection({
  value,
  onChange,
  disabled = false,
}: Props) {
  function update(patch: Partial<TreeSpeciesValue>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <FieldLabel htmlFor="tree-species" required hint={g.species}>
          Species
        </FieldLabel>
        <input
          id="tree-species"
          type="text"
          autoComplete="off"
          value={value.species}
          disabled={disabled}
          placeholder="Enter tree species"
          onChange={(event) => update({ species: event.target.value })}
          className={INPUT_CLASS}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="tree-cultivar" hint={g.cultivar}>
          Cultivar
        </FieldLabel>
        <input
          id="tree-cultivar"
          type="text"
          autoComplete="off"
          value={value.cultivar}
          disabled={disabled}
          placeholder="e.g. Red Sunset"
          onChange={(event) => update({ cultivar: event.target.value })}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}
