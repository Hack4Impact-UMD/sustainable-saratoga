export const ownershipOptions = ["DPW-controlled", "Private"];
export const propertyOwnerOptions = ["Same as host", "Someone else"];

export const ifNotInRowOptions = [
  "Not applicable",
  "Front yard",
  "Side yard",
  "Back yard",
];

export const exposureOptions = [
  "North (N)",
  "Northeast (NE)",
  "East (E)",
  "Southeast (SE)",
  "South (S)",
  "Southwest (SW)",
  "West (W)",
  "Northwest (NW)",
];

export const wireConflictOptions = [
  "No wires nearby",
  "Clear as it matures",
  "Wire conflict",
];

export const yesNoOptions = ["Yes", "No"];

// TODO: replace with the actual event list once it exists in the backend.
export const eventOptions = ["Tree Toga", "Community planting", "Other"];

export function eventYearOptions(now = new Date()): string[] {
  const last = now.getFullYear() + 1;
  const years: string[] = [];
  for (let year = last; year >= 2020; year--) years.push(String(year));
  return years;
}