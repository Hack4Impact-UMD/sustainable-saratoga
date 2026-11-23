import { type } from "arktype";
import type { Firestore } from "firebase-admin/firestore";
import { treeDocument } from "@repo/common";
import type { MapMarker, MapMarkersInput } from "@repo/common";

const addressGroup = type({
  count: "number.safe >= 0",
  nextTreeNumber: "number.safe >= 1",
});

export async function listMapMarkers(
  db: Firestore,
  filters: MapMarkersInput,
): Promise<MapMarker[]> {
  const snapshot = await db.collection("trees").get();
  const docs = snapshot.docs.map((doc) => treeDocument.assert(doc.data()));

  // Collect the unique address keys we need counts for.
  const addressKeys = [...new Set(docs.map((d) => d.addressKey))];
  const countMap = new Map<string, number>();
  await Promise.all(
    addressKeys.map(async (key) => {
      const groupSnap = await db.collection("treeAddresses").doc(key).get();
      const count = groupSnap.exists
        ? addressGroup.assert(groupSnap.data()).count
        : 0;
      countMap.set(key, count);
    }),
  );

  const markers: MapMarker[] = docs.map((record) => {
    const treeCount = countMap.get(record.addressKey) ?? 1;
    const seasonYear =
      record.eventPlantingDetails?.year ??
      new Date(record.recordInformation.createdAt).getFullYear();
    const plantedYear = record.eventPlantingDetails?.yearPlanted ?? undefined;

    return {
      id: record.id,
      lat: record.lat,
      lng: record.lng,
      address: record.address,
      treeNumber: record.treeNumber,
      treeCount,
      recordType: "planting" as const,
      status: record.status,
      seasonYear,
      issuedBy: record.responsibleMemberUid ?? "unassigned",
      ...(record.species !== null && { species: record.species }),
      ...(plantedYear !== null && { plantedYear }),
    };
  });

  return markers.filter((marker) => matchesFilters(marker, filters));
}

function matchesFilters(marker: MapMarker, filters: MapMarkersInput): boolean {
  if (filters.status?.length && !filters.status.includes(marker.status)) {
    return false;
  }

  if (filters.year?.length && !filters.year.includes(marker.seasonYear)) {
    return false;
  }

  return true;
}
