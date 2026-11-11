import { type } from "arktype";

/** IDs shared with the public map markers. */
export const sampleRecordIds = [
  "maple-ln",
  "maple-ln-2",
  "birchfield-ave",
  "lantern-ct",
  "orchard-row",
  "quarry-st",
  "willowbrook-rd",
  "fernhill-dr",
] as const;

export const recordOrigin = type("'requested' | 'possible'");

/** A status must belong to the pipeline that originated the record. */
export const recordPipelineState = type({
  origin: "'requested'",
  status: "'requested' | 'approved' | 'planted'",
}).or({
  origin: "'possible'",
  status: "'possible' | 'approved' | 'planted'",
});
export type RecordPipelineState = typeof recordPipelineState.infer;

const recordPhoto = type({
  src: "string >= 1",
  caption: "string >= 1",
  takenAt: "string >= 1",
});

const healthCheck = type({
  date: "string >= 1",
  inspector: "string >= 1",
  height: "string | null",
  canopyWidth: "string | null",
  stakes: "string | null",
  trunkDbh: "string | null",
  crown: "string | null",
  leaves: "string | null",
  damage: "string | null",
  mulch: "string | null",
  notes: "string | null",
});

/** Full, private tree record used by the authenticated record details page. */
export const treeRecord = type({
  id: "string >= 1",
  address: "string >= 1",
  city: "string >= 1",
  state: "string >= 1",
  zip: "string | null",
  treeNumber: "number.integer >= 1",
  treeCount: "number.integer >= 1",
  species: "string | null",
  scientificName: "string | null",
  cultivar: "string | null",
  lat: "number",
  lng: "number",
  latestPhotoDate: "string | null",
  location: type({
    ownership: "string | null",
    description: "string | null",
  }),
  siteAssessment: type({
    energyDirection: "string | null",
    wireConflict: "string | null",
    treeLawnRowSpace: "string | null",
    ifNotInRow: "string | null",
    overheadUtilities: "string | null",
    undergroundUtilities: "string | null",
    crown: "string | null",
    preparationRequired: "string | null",
    notes: "string | null",
  }),
  plantingPreparation: type({
    spotFlagged: "string | null",
    readyToPlant: "string | null",
    comingSoonSign: "string | null",
    utilityMarked: "string | null",
    roots: "string | null",
    needToPlant: "string | null",
    notes: "string | null",
  }),
  healthChecks: healthCheck.array(),
  photos: recordPhoto.array(),
  contacts: type({
    treeHost: "string | null",
    propertyOwner: "string | null",
    email: "string | null",
    phone: "string | null",
  }),
  eventPlantingDetails: type({
    event: "string | null",
    year: "number.integer | null",
    treeTogaNumber: "number.integer | null",
    plantingDate: "string | null",
    yearPlanted: "number.integer | null",
    plantedBy: "string | null",
  }),
  recordInformation: type({
    lastEditedAt: "string | null",
    lastEditedBy: "string | null",
    createdAt: "string | null",
    createdBy: "string | null",
  }),
}).and(recordPipelineState);

export type TreeRecord = typeof treeRecord.infer;
