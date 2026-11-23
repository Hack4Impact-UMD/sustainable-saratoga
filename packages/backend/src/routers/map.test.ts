import type { Auth } from "firebase-admin/auth";
import type {
  DocumentData,
  DocumentSnapshot,
  Firestore,
  QuerySnapshot,
} from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import type { MapMarker } from "@repo/common";
import type { Context } from "@backend/trpc/context.ts";
import { createCaller } from "@backend/routers/index.ts";
import { treeAddressKey } from "@backend/services/records.ts";

const publicFields = [
  "id",
  "lat",
  "lng",
  "address",
  "treeNumber",
  "treeCount",
  "recordType",
  "status",
  "issuedBy",
  "species",
  "seasonYear",
  "plantedYear",
] as const;

/** Minimal valid siteAssessment for the new editableTreeFields shape. */
const emptySiteAssessment = {
  exposure: null,
  wireConflict: null,
  treeLawnRowSpace: null,
  ifNotInRow: null,
  overheadUtilities: null,
  undergroundUtilities: null,
  crown: null,
  preparationRequired: null,
  nextSteps: null,
};

const emptyBase = {
  zip: null,
  scientificName: null,
  cultivar: null,
  responsibleMemberUid: null,
  location: { ownership: null, description: null },
  siteAssessment: emptySiteAssessment,
  plantingPreparation: {
    spotFlagged: null,
    readyToPlant: null,
    comingSoonSign: null,
    utilityMarked: null,
    roots: null,
    needToPlant: null,
    notes: null,
  },
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
    createdAt: "2024-01-01T00:00:00.000Z",
    createdBy: "seed-admin",
    lastEditedAt: "2024-01-01T00:00:00.000Z",
    lastEditedBy: "seed-admin",
  },
};

/** Build a minimal tree document that projects to the given marker shape. */
function treeDoc(
  id: string,
  address: string,
  overrides: Partial<{
    lat: number;
    lng: number;
    origin: "requested" | "possible";
    status: string;
    responsibleMemberUid: string;
    species: string;
    treeNumber: number;
    year: number;
    plantedYear: number;
    createdAt: string;
  }>,
): DocumentData {
  const city = "Saratoga Springs";
  const state = "NY";
  const addressKey = treeAddressKey({ address, city, state });
  return {
    ...emptyBase,
    id,
    address,
    city,
    state,
    addressKey,
    lat: overrides.lat ?? 43.08,
    lng: overrides.lng ?? -73.78,
    origin: overrides.origin ?? "requested",
    status: overrides.status ?? "requested",
    treeNumber: overrides.treeNumber ?? 1,
    responsibleMemberUid: overrides.responsibleMemberUid ?? null,
    species: overrides.species ?? null,
    eventPlantingDetails: {
      ...emptyBase.eventPlantingDetails,
      year: overrides.year ?? null,
      yearPlanted: overrides.plantedYear ?? null,
    },
    recordInformation: {
      ...emptyBase.recordInformation,
      createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
      lastEditedAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    },
  };
}

/** Fake Firestore documents for the trees collection. */
const treeDocs: DocumentData[] = [
  treeDoc("AA11-0001", "12 Maple Hollow Ln", {
    lat: 43.0831,
    lng: -73.7845,
    origin: "requested",
    status: "planted",
    responsibleMemberUid: "dana-ruiz",
    species: "Red maple",
    treeNumber: 2,
    year: 2026,
    plantedYear: 2026,
  }),
  treeDoc("AA11-0002", "12 Maple Hollow Ln", {
    lat: 43.0831,
    lng: -73.7845,
    origin: "requested",
    status: "planted",
    responsibleMemberUid: "leo-brandt",
    species: "Sugar maple",
    treeNumber: 1,
    year: 2024,
    plantedYear: 2024,
  }),
  treeDoc("BB22-0001", "48 Birchfield Ave", {
    lat: 43.0788,
    lng: -73.7814,
    origin: "possible",
    status: "possible",
    responsibleMemberUid: "sam-okafor",
    species: "River birch",
    year: 2024,
  }),
  treeDoc("CC33-0001", "7 Lantern Ct", {
    lat: 43.0812,
    lng: -73.7871,
    origin: "requested",
    status: "approved",
    responsibleMemberUid: "priya-nair",
    species: "White oak",
    year: 2026,
  }),
  treeDoc("DD44-0001", "115 Orchard Row", {
    lat: 43.0766,
    lng: -73.7902,
    origin: "requested",
    status: "planted",
    responsibleMemberUid: "leo-brandt",
    species: "Eastern white pine",
    year: 2023,
    plantedYear: 2023,
  }),
  treeDoc("EE55-0001", "203 Quarry St", {
    lat: 43.0854,
    lng: -73.7789,
    origin: "requested",
    status: "approved",
    responsibleMemberUid: "dana-ruiz",
    species: "American elm",
    year: 2026,
  }),
  treeDoc("FF66-0001", "31 Willowbrook Rd", {
    lat: 43.0769,
    lng: -73.7908,
    origin: "requested",
    status: "requested",
    responsibleMemberUid: "sam-okafor",
    species: "Eastern white pine",
    year: 2023,
  }),
  treeDoc("AA77-0001", "260 Fernhill Dr", {
    lat: 43.0762,
    lng: -73.7896,
    origin: "possible",
    status: "possible",
    responsibleMemberUid: "priya-nair",
    species: "Eastern white pine",
    year: 2024,
  }),
];

/** Address groups: maple-ln has 2 trees, all others have 1. */
function addressGroupCount(addressKey: string): number {
  const mapleKey = treeAddressKey({
    address: "12 Maple Hollow Ln",
    city: "Saratoga Springs",
    state: "NY",
  });
  return addressKey === mapleKey ? 2 : 1;
}

function makeMockDb(): Firestore {
  const db = {
    collection(name: string) {
      if (name === "trees") {
        return {
          get(): Promise<QuerySnapshot> {
            return Promise.resolve({
              docs: treeDocs.map((data) => ({
                data: () => data,
              })),
            } as unknown as QuerySnapshot);
          },
        };
      }
      if (name === "treeAddresses") {
        return {
          doc(key: string) {
            return {
              get(): Promise<DocumentSnapshot> {
                const count = addressGroupCount(key);
                return Promise.resolve({
                  exists: true,
                  data: () => ({ count, nextTreeNumber: count + 1 }),
                } as unknown as DocumentSnapshot);
              },
            };
          },
        };
      }
      throw new Error(`Unexpected collection: ${name}`);
    },
  } as unknown as Firestore;
  return db;
}

function caller(session: Context["session"]) {
  const db = makeMockDb();
  const auth = undefined as unknown as Auth;
  return createCaller({ session, db, auth });
}

const anonymous = caller(null);

/** Expected markers from the mock data, in insertion order. */
const expectedMarkers: MapMarker[] = [
  {
    id: "AA11-0001",
    lat: 43.0831,
    lng: -73.7845,
    address: "12 Maple Hollow Ln",
    treeNumber: 2,
    treeCount: 2,
    recordType: "planting",
    status: "planted",
    issuedBy: "dana-ruiz",
    species: "Red maple",
    seasonYear: 2026,
    plantedYear: 2026,
  },
  {
    id: "AA11-0002",
    lat: 43.0831,
    lng: -73.7845,
    address: "12 Maple Hollow Ln",
    treeNumber: 1,
    treeCount: 2,
    recordType: "planting",
    status: "planted",
    issuedBy: "leo-brandt",
    species: "Sugar maple",
    seasonYear: 2024,
    plantedYear: 2024,
  },
  {
    id: "BB22-0001",
    lat: 43.0788,
    lng: -73.7814,
    address: "48 Birchfield Ave",
    treeNumber: 1,
    treeCount: 1,
    recordType: "planting",
    status: "possible",
    issuedBy: "sam-okafor",
    species: "River birch",
    seasonYear: 2024,
  },
  {
    id: "CC33-0001",
    lat: 43.0812,
    lng: -73.7871,
    address: "7 Lantern Ct",
    treeNumber: 1,
    treeCount: 1,
    recordType: "planting",
    status: "approved",
    issuedBy: "priya-nair",
    species: "White oak",
    seasonYear: 2026,
  },
  {
    id: "DD44-0001",
    lat: 43.0766,
    lng: -73.7902,
    address: "115 Orchard Row",
    treeNumber: 1,
    treeCount: 1,
    recordType: "planting",
    status: "planted",
    issuedBy: "leo-brandt",
    species: "Eastern white pine",
    seasonYear: 2023,
    plantedYear: 2023,
  },
  {
    id: "EE55-0001",
    lat: 43.0854,
    lng: -73.7789,
    address: "203 Quarry St",
    treeNumber: 1,
    treeCount: 1,
    recordType: "planting",
    status: "approved",
    issuedBy: "dana-ruiz",
    species: "American elm",
    seasonYear: 2026,
  },
  {
    id: "FF66-0001",
    lat: 43.0769,
    lng: -73.7908,
    address: "31 Willowbrook Rd",
    treeNumber: 1,
    treeCount: 1,
    recordType: "planting",
    status: "requested",
    issuedBy: "sam-okafor",
    species: "Eastern white pine",
    seasonYear: 2023,
  },
  {
    id: "AA77-0001",
    lat: 43.0762,
    lng: -73.7896,
    address: "260 Fernhill Dr",
    treeNumber: 1,
    treeCount: 1,
    recordType: "planting",
    status: "possible",
    issuedBy: "priya-nair",
    species: "Eastern white pine",
    seasonYear: 2024,
  },
];

describe("map.markers", () => {
  it("returns every mock marker to an anonymous caller", async () => {
    await expect(anonymous.map.markers({})).resolves.toEqual(expectedMarkers);
  });

  it("narrows by status", async () => {
    const markers = await anonymous.map.markers({ status: ["planted"] });

    expect(markers.map((marker) => marker.id)).toEqual([
      "AA11-0001",
      "AA11-0002",
      "DD44-0001",
    ]);
  });

  it("filters by season year, including possible records", async () => {
    const markers = await anonymous.map.markers({ year: [2024] });

    expect(markers.map((marker) => marker.id)).toEqual([
      "AA11-0002",
      "BB22-0001",
      "AA77-0001",
    ]);
    expect(markers.every((marker) => marker.seasonYear === 2024)).toBe(true);
  });

  it("rejects fractional season years", async () => {
    await expect(
      anonymous.map.markers({ year: [2024.5] }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("applies status and year together", async () => {
    const markers = await anonymous.map.markers({
      status: ["planted"],
      year: [2024],
    });

    expect(markers).toEqual([
      expect.objectContaining({ id: "AA11-0002", treeCount: 2 }),
    ]);
  });

  it("returns issuer user IDs for each marker", async () => {
    const markers = await anonymous.map.markers({});

    expect(markers.map(({ id, issuedBy }) => [id, issuedBy])).toEqual([
      ["AA11-0001", "dana-ruiz"],
      ["AA11-0002", "leo-brandt"],
      ["BB22-0001", "sam-okafor"],
      ["CC33-0001", "priya-nair"],
      ["DD44-0001", "leo-brandt"],
      ["EE55-0001", "dana-ruiz"],
      ["FF66-0001", "sam-okafor"],
      ["AA77-0001", "priya-nair"],
    ]);
  });

  it("treats explicit undefined filters as omitted", async () => {
    await expect(
      anonymous.map.markers({ year: undefined, status: undefined }),
    ).resolves.toEqual(expectedMarkers);
  });

  it("rejects an invalid status", async () => {
    await expect(
      anonymous.map.markers({ status: "bogus" } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns copies that only include public fields", async () => {
    const markers = await anonymous.map.markers({});
    const first = markers[0];
    expect(first).toBeDefined();
    if (!first) return;

    expect(Object.keys(first).sort()).toEqual(
      [
        "id",
        "lat",
        "lng",
        "address",
        "treeNumber",
        "treeCount",
        "recordType",
        "issuedBy",
        "seasonYear",
        "plantedYear",
        "species",
        "status",
      ].sort(),
    );
    for (const marker of markers) {
      for (const key of Object.keys(marker)) {
        expect(publicFields).toContain(key);
      }
    }

    first.species = "Changed species";
    const again = await anonymous.map.markers({});
    expect(again[0]?.species).toBe("Red maple");
  });
});
