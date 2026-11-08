import { mockMapMarkers } from "@backend/services/mockMapMarkers.ts";
import { sampleRecordIds, treeRecord } from "@repo/common";
import { describe, expect, it } from "vitest";
import { getSampleRecord } from "@frontend/lib/sampleRecords.ts";

const photoAssets = import.meta.glob("../../public/sample-photos/*", {
  eager: true,
  query: "?url",
  import: "default",
});

function requireSampleRecord(id: string) {
  const record = getSampleRecord(id);
  if (!record) throw new Error(`Missing sample record: ${id}`);
  return record;
}

describe("sample records", () => {
  it("provides a full record for every map sample id", () => {
    for (const id of sampleRecordIds) {
      const record = getSampleRecord(id);

      expect(record).toBeDefined();
      if (!record) continue;
      expect(record.id).toBe(id);
      expect(() => treeRecord.assert(record)).not.toThrow();
    }
  });

  it("returns undefined for unknown ids", () => {
    expect(getSampleRecord("missing-tree")).toBeUndefined();
  });
  it("matches public map data without leaking private fields", () => {
    expect(mockMapMarkers.map(({ id }) => id)).toEqual([...sampleRecordIds]);
    expect(new Set(mockMapMarkers.map(({ id }) => id)).size).toBe(
      sampleRecordIds.length,
    );
    for (const marker of mockMapMarkers) {
      const record = requireSampleRecord(marker.id);
      for (const field of [
        "address",
        "lat",
        "lng",
        "species",
        "status",
        "treeNumber",
        "treeCount",
      ] as const) {
        expect(record[field], `${marker.id}.${field}`).toEqual(marker[field]);
      }
      expect(record.eventPlantingDetails.year).toBe(marker.seasonYear);
      expect(record.eventPlantingDetails.yearPlanted).toBe(
        marker.plantedYear ?? null,
      );
      expect(marker).not.toHaveProperty("contacts");
      expect(marker).not.toHaveProperty("healthChecks");
    }
  });

  it("supplies the populated Figma record", () => {
    const record = requireSampleRecord("maple-ln");
    expect(record).toMatchObject({
      status: "planted",
      origin: "requested",
      treeNumber: 2,
      treeCount: 2,
      species: "Red maple",
      scientificName: "Acer rubrum",
      latestPhotoDate: "2026-09-14",
      siteAssessment: {
        energyDirection: "South",
        wireConflict: "Will be clear of wires as it matures",
      },
      plantingPreparation: { spotFlagged: "Yes", readyToPlant: null },
    });
    expect(record.healthChecks[0]).toMatchObject({
      height: "10 ft or less",
      trunkDbh: "1.5 in",
      canopyWidth: "5 ft or less",
      stakes: "Original stakes",
      leaves: "All branches healthy",
      notes: "Loosened stake ties.",
    });
    expect(record.photos).toHaveLength(6);
    expect(record.photos[0]).toMatchObject({
      caption: "Whole property",
      takenAt: "2026-03-09",
    });
    expect(getSampleRecord("maple-ln-2")).toMatchObject({
      treeNumber: 1,
      treeCount: 2,
    });
  });

  it("keeps every referenced photo in the repo and supports empty records", () => {
    for (const id of sampleRecordIds) {
      for (const photo of requireSampleRecord(id).photos) {
        expect(photo.src).toMatch(/^\/sample-photos\//);
        expect(photoAssets[`../../public${photo.src}`]).toBeDefined();
      }
    }
    expect(getSampleRecord("birchfield-ave")).toMatchObject({
      photos: [],
      healthChecks: [],
      scientificName: null,
    });
  });
});
