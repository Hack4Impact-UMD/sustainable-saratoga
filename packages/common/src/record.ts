import { type } from "arktype";
import { nonEmptyTrimmed } from "@common/fields.ts";
import { treeStatus } from "@common/map.ts";

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

const recordLocation = type({
  ownership: "string | null",
  description: "string | null",
});
const recordSiteAssessment = type({
  energyDirection: "string | null",
  wireConflict: "string | null",
  treeLawnRowSpace: "string | null",
  ifNotInRow: "string | null",
  overheadUtilities: "string | null",
  undergroundUtilities: "string | null",
  crown: "string | null",
  preparationRequired: "string | null",
  notes: "string | null",
});
const recordPlantingPreparation = type({
  spotFlagged: "string | null",
  readyToPlant: "string | null",
  comingSoonSign: "string | null",
  utilityMarked: "string | null",
  roots: "string | null",
  needToPlant: "string | null",
  notes: "string | null",
});
const recordContacts = type({
  treeHost: "string | null",
  propertyOwner: "string | null",
  email: "string | null",
  phone: "string | null",
});
const recordEventPlantingDetails = type({
  event: "string | null",
  year: "number.integer | null",
  treeTogaNumber: "number.integer | null",
  plantingDate: "string | null",
  yearPlanted: "number.integer | null",
  plantedBy: "string | null",
});

/** Fixture shape used by the record pages until they switch to the records API. */
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
  responsible: "string | null",
  lat: "number",
  lng: "number",
  latestPhotoDate: "string | null",
  location: recordLocation,
  siteAssessment: recordSiteAssessment,
  plantingPreparation: recordPlantingPreparation,
  healthChecks: healthCheck.array(),
  photos: recordPhoto.array(),
  contacts: recordContacts,
  eventPlantingDetails: recordEventPlantingDetails,
  recordInformation: type({
    lastEditedAt: "string | null",
    lastEditedBy: "string | null",
    createdAt: "string | null",
    createdBy: "string | null",
  }),
}).and(recordPipelineState);

export type TreeRecord = typeof treeRecord.infer;

export const treeAddress = type({
  "+": "reject",
  address: nonEmptyTrimmed,
  city: nonEmptyTrimmed,
  state: nonEmptyTrimmed,
  "zip?": "string | null",
});
export type TreeAddress = typeof treeAddress.infer;

const treeRecordId = type(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
const memberUid = type(/^[^/]{1,128}$/).narrow(
  (uid, ctx) =>
    (uid !== "." && uid !== ".." && !/^__.*__$/.test(uid)) ||
    ctx.mustBe("a member UID"),
);

const photoCaption = type("string.trim")
  .to("string <= 60")
  .pipe((caption) => caption || "Untitled photo");
const savedRecordPhoto = type({
  "+": "reject",
  src: nonEmptyTrimmed,
  caption: photoCaption.default("Untitled photo"),
  takenAt: "string.date.iso",
});

const editableTreeFields = treeAddress.merge({
  lat: "-90 <= number <= 90",
  lng: "-180 <= number <= 180",
  "species?": "string | null",
  "scientificName?": "string | null",
  "cultivar?": "string | null",
  "responsibleMemberUid?": memberUid.or("null"),
  "location?": recordLocation.partial().onUndeclaredKey("reject"),
  "siteAssessment?": recordSiteAssessment
    .omit("energyDirection", "notes")
    .merge({ exposure: "string | null", nextSteps: "string | null" })
    .partial()
    .onUndeclaredKey("reject"),
  "plantingPreparation?": recordPlantingPreparation
    .partial()
    .onUndeclaredKey("reject"),
  "photos?": savedRecordPhoto.array(),
  "contacts?": recordContacts.partial().onUndeclaredKey("reject"),
  "eventPlantingDetails?": recordEventPlantingDetails
    .partial()
    .onUndeclaredKey("reject"),
});

export const createTreeRecordInput = editableTreeFields
  .merge({ status: recordOrigin })
  .onUndeclaredKey("reject");
export type CreateTreeRecordInput = typeof createTreeRecordInput.infer;

export const getTreeRecordInput = type({ "+": "reject", id: treeRecordId });

export const updateTreeRecordInput = type({
  "+": "reject",
  id: treeRecordId,
  changes: editableTreeFields
    .merge({ status: treeStatus })
    .partial()
    .onUndeclaredKey("reject"),
});
export type UpdateTreeRecordInput = typeof updateTreeRecordInput.infer;

const treeDocumentFields = editableTreeFields.merge({
  id: treeRecordId,
  addressKey: "string.hex",
  treeNumber: "number.safe >= 1",
  responsibleMemberUid: memberUid.or("null"),
  photos: savedRecordPhoto.array(),
  recordInformation: type({
    "+": "reject",
    createdAt: "string.date.iso",
    createdBy: memberUid,
    lastEditedAt: "string.date.iso",
    lastEditedBy: memberUid,
  }),
});

/** Stored at trees/{id}. Read paths obtain the current count from the address group. */
export const treeDocument = treeDocumentFields
  .merge({ origin: recordOrigin, status: treeStatus })
  .onUndeclaredKey("reject")
  .and(recordPipelineState);
export type TreeDocument = typeof treeDocument.infer;

/** Private API response. The address key is internal to persistence. */
export type SavedTreeRecord = Omit<
  TreeDocument,
  "addressKey" | "status" | "origin"
> &
  RecordPipelineState & { treeCount: number };
