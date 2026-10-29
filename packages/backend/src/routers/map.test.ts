import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import type { Context } from "@backend/trpc/context.ts";
import { createCaller } from "@backend/routers/index.ts";
import { mockMapMarkers } from "@backend/services/mockMapMarkers.ts";

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

function caller(session: Context["session"]) {
  const db = undefined as unknown as Firestore;
  return createCaller({ session, db });
}

const anonymous = caller(null);

describe("map.markers", () => {
  it("returns every mock marker to an anonymous caller", async () => {
    await expect(anonymous.map.markers({})).resolves.toEqual(mockMapMarkers);
  });

  it("narrows by status", async () => {
    const markers = await anonymous.map.markers({ status: ["planted"] });

    expect(markers.map((marker) => marker.id)).toEqual([
      "maple-ln-2",
      "orchard-row",
    ]);
  });

  it("filters by season year, including requested records", async () => {
    const markers = await anonymous.map.markers({ year: [2024] });

    expect(markers.map((marker) => marker.id)).toEqual([
      "maple-ln",
      "maple-ln-2",
      "birchfield-ave",
      "fernhill-dr",
    ]);
    expect(markers.every((marker) => marker.seasonYear === 2024)).toBe(true);
  });

  it("applies status and year together", async () => {
    const markers = await anonymous.map.markers({
      status: ["planted"],
      year: [2024],
    });

    expect(markers).toEqual([
      expect.objectContaining({ id: "maple-ln-2", treeCount: 12 }),
    ]);
  });

  it("returns issuer user IDs for each marker", async () => {
    const markers = await anonymous.map.markers({});

    expect(markers.map(({ id, issuedBy }) => [id, issuedBy])).toEqual([
      ["maple-ln", "dana-ruiz"],
      ["maple-ln-2", "leo-brandt"],
      ["birchfield-ave", "sam-okafor"],
      ["lantern-ct", "priya-nair"],
      ["orchard-row", "leo-brandt"],
      ["quarry-st", "dana-ruiz"],
      ["willowbrook-rd", "sam-okafor"],
      ["fernhill-dr", "priya-nair"],
    ]);
  });

  it("treats explicit undefined filters as omitted", async () => {
    await expect(
      anonymous.map.markers({ year: undefined, status: undefined }),
    ).resolves.toEqual(mockMapMarkers);
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
