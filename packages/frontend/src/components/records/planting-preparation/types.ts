
export type PlantingPreparationValue = {
  spotFlagged: boolean | null;
  readyToPlant: boolean | null;
  comingSoonSign: boolean | null;
  utilityMarked: boolean | null;
  roots: string;
  needToPlant: string;
  notes: string;
};

export const EMPTY_PLANTING_PREPARATION: PlantingPreparationValue = {
  spotFlagged: null,
  readyToPlant: null,
  comingSoonSign: null,
  utilityMarked: null,
  roots: "",
  needToPlant: "",
  notes: "",
};

export function countFilledPlantingPreparationFields(
  value: PlantingPreparationValue,
): number {
  return (
    [
      value.spotFlagged,
      value.readyToPlant,
      value.comingSoonSign,
      value.utilityMarked,
    ].filter((field) => field !== null).length +
    [value.roots, value.needToPlant, value.notes].filter(
      (field) => field.trim().length > 0,
    ).length
  );
}
