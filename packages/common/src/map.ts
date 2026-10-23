import { type } from "arktype";

/** Planting statuses shown on the landing-page map. */
export const treeStatus = type(
  "'requested' | 'approved' | 'planted' | 'not_planted'",
);
export type TreeStatus = typeof treeStatus.infer;

/**
 * One public-safe map point. Homeowner contact and address stay off this
 * shape so the landing page can render pins without private fields.
 */
export const mapMarker = type({
  id: "string >= 1",
  lat: "number",
  lng: "number",
  status: treeStatus,
  "species?": "string >= 1 | undefined",
  "plantedYear?": "number.integer | undefined",
});
export type MapMarker = typeof mapMarker.infer;

/**
 * Optional filters for `map.markers`. An empty object, or explicit
 * `undefined` values, returns every marker.
 */
export const mapMarkersInput = type({
  "year?": "number.integer | undefined",
  "status?": treeStatus.or("undefined"),
});
export type MapMarkersInput = typeof mapMarkersInput.infer;
