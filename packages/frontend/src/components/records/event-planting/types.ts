export type EventPlantingValue = {
  event: string;
  eventYear: string;
  treeTogaNumber: string;
  plantingDate: string;
  plantedBy: string;
};

export const EMPTY_EVENT_PLANTING: EventPlantingValue = {
  event: "",
  eventYear: "",
  treeTogaNumber: "",
  plantingDate: "",
  plantedBy: " ",
};

export function countFilledEventPlantingFields(
  value: EventPlantingValue,
) {
  return (
    (value.event.trim() ? 1 : 0) +
    (value.eventYear.trim() ? 1 : 0) +
    (value.treeTogaNumber.trim() ? 1 : 0) +
    (value.plantingDate.trim() ? 1 : 0) +
    (value.plantedBy.trim() ? 1 : 0)
  );
}
