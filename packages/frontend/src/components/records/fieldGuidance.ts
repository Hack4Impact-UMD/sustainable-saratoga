/** Short explanations shown from each field's ⓘ button. */
export const fieldGuidance = {
  address: "Street address of the planting site.",
  ownership:
    "DPW-controlled means the city's Department of Public Works manages the spot; otherwise it is private property.",
  locationDescription:
    "Where on the property the tree goes, and any landmarks that help someone find it.",
  treeHost: "The person who agrees to care for the tree, especially watering.",
  propertyOwner: "Who owns the property. “Same as host” if the host owns it.",
  email: "Best email address for reaching the host.",
  phone: "Best phone number for reaching the host.",
  treeLawnRowSpace:
    "Width of the tree lawn or right-of-way (ROW) available for planting.",
  ifNotInRow: "Where the tree goes when it is outside the right-of-way.",
  exposure: "Compass direction the planting spot faces for sun exposure.",
  wireConflict: "Whether overhead wires could conflict with the mature tree.",
  preparationRequired:
    "Work needed before planting, such as removing a stump or sod.",
  notes: "Anything the planting team should know before or after planting.",
  spotFlagged: "Whether the planting spot has been marked with a flag.",
  comingSoonSign: "Whether a “Tree Coming Soon” sign is posted.",
  utilitiesMarked:
    "Whether underground utilities have been marked (call before digging).",
  readyToPlant: "Whether the spot is fully prepared for planting.",
  species: "The kind of tree. The Latin (scientific) name appears below.",
  cultivar: "A named variety of the species, if there is one.",
  event: "The planting event this tree belongs to.",
  eventYear: "The year of that event.",
  treeTogaNumber: "The tree's number within the Tree Toga event.",
  plantingDate: "The day the tree went into the ground.",
  plantedBy: "The person or group who planted the tree.",
} as const;
