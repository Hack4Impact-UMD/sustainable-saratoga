import { fieldGuidance as g } from "@frontend/components/records/fieldGuidance.ts";
import { FieldLabel } from "@frontend/components/records/FieldLabel.tsx";
import type { PlantingPreparationValue } from "@frontend/components/records/planting-preparation/types.ts";

type PlantingPreparationSectionProps = {
  value: PlantingPreparationValue;
  onChange: (value: PlantingPreparationValue) => void;
  disabled?: boolean;
};

type BooleanField =
  | "spotFlagged"
  | "readyToPlant"
  | "comingSoonSign"
  | "utilityMarked";

const QUESTIONS: { key: BooleanField; label: string; hint: string }[] = [
  { key: "spotFlagged", label: "Planting spot flagged", hint: g.spotFlagged },
  {
    key: "comingSoonSign",
    label: "Coming Soon sign placed",
    hint: g.comingSoonSign,
  },
  { key: "utilityMarked", label: "Utilities marked", hint: g.utilitiesMarked },
  {
    key: "readyToPlant",
    label: "Ready to plant (optional)",
    hint: g.readyToPlant,
  },
];

export function PlantingPreparationSection({
  value,
  onChange,
  disabled = false,
}: PlantingPreparationSectionProps) {
  function updateField<K extends keyof PlantingPreparationValue>(
    field: K,
    fieldValue: PlantingPreparationValue[K],
  ) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <div className="space-y-5">
      {QUESTIONS.map(({ key, label, hint }) => {
        const labelId = `planting-prep-${key}-label`;

        return (
          <div key={key} className="flex items-center justify-between gap-3">
            <FieldLabel id={labelId} hint={hint}>
              {label}
            </FieldLabel>

            <div
              role="group"
              aria-labelledby={labelId}
              className="flex shrink-0 gap-2"
            >
              {(["Yes", "No"] as const).map((option) => {
                const selected = value[key] === (option === "Yes");

                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateField(key, option === "Yes")}
                    disabled={disabled}
                    className={`min-h-11 min-w-16 rounded-md border px-3 text-[15px] font-semibold ${
                      selected
                        ? "border-primary bg-primary/10 text-heading"
                        : "border-divider bg-surface text-body"
                    } disabled:opacity-60`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
