import type { TreeRecord } from "@repo/common";

export type RecordStatus = TreeRecord["status"];
export type FormPhoto = TreeRecord["photos"][number];

/**
 * Everything the edit/new form can change. Text-ish values are plain strings
 * ("" = empty) and choices are `string | null`, so inputs stay controlled.
 * Number-like fields (lawn space, year, Tree Toga number) are strings here;
 * convert them when building the save payload.
 */
export interface RecordFormValues {
  status: RecordStatus;
  responsible: string | null;

  address: string;
  ownership: string | null;
  locationDescription: string;

  treeHost: string;
  email: string;
  phone: string;
  propertyOwner: string | null;

  treeLawnRowSpace: string;
  ifNotInRow: string | null;
  energyDirection: string | null;
  /** One question: a preset answer or the typed "Other" text. */
  wireConflict: string | null;
  preparationRequired: string;
  notes: string;

  spotFlagged: string | null;
  comingSoonSign: string | null;
  utilityMarked: string | null;
  readyToPlant: string | null;

  species: string | null;
  /** Set together with `species` by the picker. Not counted on its own. */
  scientificName: string | null;
  cultivar: string;

  photos: FormPhoto[];

  event: string | null;
  year: string | null;
  treeTogaNumber: string;
  plantingDate: string;
  plantedBy: string;
}

export type RecordFormErrors = Partial<Record<keyof RecordFormValues, string>>;

/** Starting values for the "new record" form. */
export const emptyRecordFormValues: RecordFormValues = {
  status: "requested",
  responsible: null,
  address: "",
  ownership: null,
  locationDescription: "",
  treeHost: "",
  email: "",
  phone: "",
  propertyOwner: null,
  treeLawnRowSpace: "",
  ifNotInRow: null,
  energyDirection: null,
  wireConflict: null,
  preparationRequired: "",
  notes: "",
  spotFlagged: null,
  comingSoonSign: null,
  utilityMarked: null,
  readyToPlant: null,
  species: null,
  scientificName: null,
  cultivar: "",
  photos: [],
  event: null,
  year: null,
  treeTogaNumber: "",
  plantingDate: "",
  plantedBy: "",
};

/** Map a saved record onto form values. Memoize the result in the caller. */
export function recordToFormValues(record: TreeRecord): RecordFormValues {
  const { location, contacts, siteAssessment: site } = record;
  const { plantingPreparation: prep, eventPlantingDetails: event } = record;

  return {
    status: record.status,
    responsible: record.responsible,

    address: [record.address, record.city, record.state].join(", "),
    ownership: location.ownership,
    locationDescription: location.description ?? "",

    treeHost: contacts.treeHost ?? "",
    email: contacts.email ?? "",
    phone: contacts.phone ?? "",
    propertyOwner: contacts.propertyOwner,

    // The number box shows "ft" itself, so drop it from the stored text.
    treeLawnRowSpace: (site.treeLawnRowSpace ?? "").replace(/\s*ft$/i, ""),
    ifNotInRow: site.ifNotInRow,
    energyDirection: site.energyDirection,
    wireConflict: site.wireConflict,
    preparationRequired: site.preparationRequired ?? "",
    notes: site.notes ?? "",

    spotFlagged: prep.spotFlagged,
    comingSoonSign: prep.comingSoonSign,
    utilityMarked: prep.utilityMarked,
    readyToPlant: prep.readyToPlant,

    species: record.species,
    scientificName: record.scientificName,
    cultivar: record.cultivar ?? "",

    photos: record.photos,

    event: event.event,
    year: event.year === null ? null : String(event.year),
    treeTogaNumber:
      event.treeTogaNumber === null ? "" : String(event.treeTogaNumber),
    plantingDate: (event.plantingDate ?? "").slice(0, 10),
    plantedBy: event.plantedBy ?? "",
  };
}

/** null, undefined and whitespace-only all mean "empty". */
function normalize(value: string | null | undefined): string {
  return value === null || value === undefined ? "" : value.trim();
}

function photoSignature(photos: FormPhoto[]): string {
  return JSON.stringify(photos.map((p) => [p.src, p.caption]));
}

function isChanged(
  key: keyof RecordFormValues,
  initial: RecordFormValues,
  current: RecordFormValues,
): boolean {
  if (key === "photos") {
    return photoSignature(initial.photos) !== photoSignature(current.photos);
  }
  if (key === "species") {
    // Species and its Latin name are one field to the person using the form.
    return (
      normalize(initial.species) !== normalize(current.species) ||
      normalize(initial.scientificName) !== normalize(current.scientificName)
    );
  }
  return (
    normalize(initial[key] as string | null) !==
    normalize(current[key] as string | null)
  );
}

/**
 * Fields whose current value differs from the initial one. A field edited back
 * to its original value is not changed.
 */
export function getChangedFields(
  initial: RecordFormValues,
  current: RecordFormValues,
): (keyof RecordFormValues)[] {
  return (Object.keys(initial) as (keyof RecordFormValues)[]).filter(
    (key) => key !== "scientificName" && isChanged(key, initial, current),
  );
}