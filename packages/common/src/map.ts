import { type } from "arktype";

/** Planting statuses shown on the landing-page map. */
export const treeStatus = type(
  "'requested' | 'possible' | 'approved' | 'planted'",
);
export type TreeStatus = typeof treeStatus.infer;

/**
 * One public-safe map point. The street address is public list data; homeowner
 * contact and other private details stay off this shape.
 */
export const mapMarker = type({
  id: "string >= 1",
  lat: "number",
  lng: "number",
  address: "string >= 1",
  treeNumber: "number.integer >= 1",
  treeCount: "number.integer >= 1",
  recordType: "'planting' | 'pruning'",
  status: treeStatus,
  seasonYear: "number.integer",
  issuedBy: "string >= 1",
  "species?": "string >= 1 | undefined",
  "plantedYear?": "number.integer | undefined",
});
export type MapMarker = typeof mapMarker.infer;

/**
 * Optional filters for `map.markers`. An empty object, or explicit
 * `undefined` values, returns every marker.
 */
export const mapMarkersInput = type({
  "year?": "number[] | undefined",
  "status?": treeStatus.array().or("undefined"),
  "memberId?": "number.integer[] | undefined",
});
export type MapMarkersInput = typeof mapMarkersInput.infer;
