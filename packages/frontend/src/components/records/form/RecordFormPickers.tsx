/**
 * PLACEHOLDER pickers. Person 2 replaces the bodies with the real E2/E3/E4
 * pickers and keeps these props, so RecordForm does not change.
 *
 * `id` goes on the trigger so the field label focuses it.
 */
import type { RecordStatus } from "@frontend/components/records/form/recordFormValues.ts";
import { SelectInput } from "@frontend/components/ui/form-controls.tsx";

interface PickerBase {
  id: string;
  invalid?: boolean;
  describedBy?: string;
}

const statusLabels: Record<RecordStatus, string> = {
  requested: "Requested",
  possible: "Possible",
  approved: "Approved",
  planted: "Planted",
};

export function StatusPicker({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: PickerBase & {
  value: RecordStatus;
  onChange: (status: RecordStatus) => void;
}) {
  const entries = Object.entries(statusLabels) as [RecordStatus, string][];
  return (
    <SelectInput
      id={id}
      invalid={invalid}
      describedBy={describedBy}
      value={statusLabels[value]}
      options={entries.map(([, label]) => label)}
      onChange={(label) => {
        const match = entries.find(([, l]) => l === label);
        if (match) onChange(match[0]);
      }}
    />
  );
}

const sampleMembers = ["Dana Ruiz", "Leo Brandt", "Priya Nair", "Sam Okafor"];

/** `value` is the member's name for now; null means Unassigned. */
export function MemberPicker({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: PickerBase & {
  value: string | null;
  onChange: (member: string | null) => void;
}) {
  return (
    <SelectInput
      id={id}
      invalid={invalid}
      describedBy={describedBy}
      value={value}
      placeholder="Unassigned"
      options={sampleMembers}
      onChange={onChange}
    />
  );
}

export interface SpeciesChoice {
  species: string;
  scientificName: string;
}

const sampleSpecies: SpeciesChoice[] = [
  { species: "Red maple", scientificName: "Acer rubrum" },
  { species: "Sugar maple", scientificName: "Acer saccharum" },
  { species: "Swamp white oak", scientificName: "Quercus bicolor" },
  { species: "Ginkgo", scientificName: "Ginkgo biloba" },
];

/** onChange(null) is "Clear selection". */
export function SpeciesPicker({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: PickerBase & {
  value: SpeciesChoice | null;
  onChange: (choice: SpeciesChoice | null) => void;
}) {
  return (
    <SelectInput
      id={id}
      invalid={invalid}
      describedBy={describedBy}
      value={value?.species ?? null}
      placeholder="Select a species"
      options={sampleSpecies.map((s) => s.species)}
      onChange={(name) =>
        onChange(sampleSpecies.find((s) => s.species === name) ?? null)
      }
    />
  );
}