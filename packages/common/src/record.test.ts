import { type } from "arktype";
import { describe, expect, it } from "vitest";
import { treeRecord } from "@common/record.ts";

const fixture = {
  id: "maple-ln",
  address: "12 Maple Hollow Ln",
  city: "Saratoga Springs",
  state: "NY",
  zip: null,
  treeNumber: 1,
  treeCount: 2,
  species: "Red maple",
  scientificName: null,
  cultivar: null,
  status: "requested",
  origin: "requested",
  lat: 43.0831,
  lng: -73.7845,
  latestPhotoDate: null,
  location: { ownership: null, description: null },
  siteAssessment: {
    energyDirection: null,
    wireConflict: null,
    treeLawnRowSpace: null,
    ifNotInRow: null,
    overheadUtilities: null,
    undergroundUtilities: null,
    crown: null,
    preparationRequired: null,
    notes: null,
  },
  plantingPreparation: {
    spotFlagged: null,
    readyToPlant: null,
    comingSoonSign: null,
    utilityMarked: null,
    roots: null,
    needToPlant: null,
    notes: null,
  },
  healthChecks: [],
  photos: [],
  contacts: {
    treeHost: null,
    propertyOwner: null,
    email: null,
    phone: null,
  },
  eventPlantingDetails: {
    event: null,
    year: null,
    treeTogaNumber: null,
    plantingDate: null,
    yearPlanted: null,
    plantedBy: null,
  },
  recordInformation: {
    lastEditedAt: null,
    lastEditedBy: null,
    createdAt: null,
    createdBy: null,
  },
};

describe("treeRecord", () => {
  it.each([
    ["requested", "requested"],
    ["requested", "approved"],
    ["requested", "planted"],
    ["possible", "possible"],
    ["possible", "approved"],
    ["possible", "planted"],
  ])(
    "accepts %s origin with %s status and nullable fields",
    (origin, status) => {
      expect(
        treeRecord({ ...fixture, origin, status }) instanceof type.errors,
      ).toBe(false);
    },
  );

  it.each([
    ["requested", "possible"],
    ["possible", "requested"],
    ["other", "planted"],
  ])("rejects %s origin with %s status", (origin, status) => {
    expect(
      treeRecord({ ...fixture, origin, status }) instanceof type.errors,
    ).toBe(true);
  });

  it("requires the Figma fields and validates their types", () => {
    const valid = treeRecord.assert(fixture);
    for (const section of [
      valid,
      valid.siteAssessment,
      valid.plantingPreparation,
    ]) {
      const fields =
        section === valid
          ? ["scientificName"]
          : section === valid.siteAssessment
            ? ["energyDirection", "wireConflict"]
            : ["spotFlagged", "readyToPlant"];
      for (const field of fields) {
        const missing = {
          ...valid,
          siteAssessment: { ...valid.siteAssessment },
          plantingPreparation: { ...valid.plantingPreparation },
        };
        const target =
          section === valid
            ? missing
            : section === valid.siteAssessment
              ? missing.siteAssessment
              : missing.plantingPreparation;
        Reflect.deleteProperty(target, field);
        expect(treeRecord(missing) instanceof type.errors).toBe(true);
        Reflect.set(target, field, 42);
        expect(treeRecord(missing) instanceof type.errors).toBe(true);
      }
    }
  });

  it("requires height, canopy width and stakes on health checks", () => {
    const check = {
      date: "2026-09-14",
      inspector: "Sam Okafor",
      height: null,
      canopyWidth: null,
      stakes: null,
      trunkDbh: null,
      crown: null,
      leaves: null,
      damage: null,
      mulch: null,
      notes: null,
    };
    expect(
      treeRecord({ ...fixture, healthChecks: [check] }) instanceof type.errors,
    ).toBe(false);
    for (const field of ["height", "canopyWidth", "stakes"]) {
      const invalid = { ...check };
      Reflect.deleteProperty(invalid, field);
      expect(
        treeRecord({ ...fixture, healthChecks: [invalid] }) instanceof
          type.errors,
      ).toBe(true);
      Reflect.set(invalid, field, 42);
      expect(
        treeRecord({ ...fixture, healthChecks: [invalid] }) instanceof
          type.errors,
      ).toBe(true);
    }
  });
});
