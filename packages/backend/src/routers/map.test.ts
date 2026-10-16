import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import type { Context } from "@backend/trpc/context.ts";
import { createCaller } from "@backend/routers/index.ts";
import { mockMapMarkers } from "@backend/services/mockMapMarkers.ts";

const publicFields = [
  "id",
  "lat",
  "lng",
  "status",
  "species",
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
    const markers = await anonymous.map.markers({ status: "planted" });

    expect(markers.map((marker) => marker.id)).toEqual([
      "maple-congress",
      "oak-broadway",
    ]);
  });

  it("narrows by year and drops markers with no planted year", async () => {
    const markers = await anonymous.map.markers({ year: 2024 });

    expect(markers.map((marker) => marker.id)).toEqual([
      "maple-congress",
      "birch-circular",
    ]);
    expect(markers.every((marker) => marker.plantedYear === 2024)).toBe(true);
  });

  it("applies status and year together", async () => {
    const markers = await anonymous.map.markers({
      status: "planted",
      year: 2024,
    });

    expect(markers).toEqual([
      expect.objectContaining({ id: "maple-congress" }),
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
      ["id", "lat", "lng", "plantedYear", "species", "status"].sort(),
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
