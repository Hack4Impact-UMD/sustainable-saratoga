export type PlacementIfNotInRow =
  | "not-applicable"
  | "front-yard"
  | "side-yard"
  | "back-yard";

export type Exposure = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export type WireConflict =
  | "none"
  | "clear-as-it-matures"
  | "conflict"
  | "other";

export type SiteAssessmentValue = {
  /** Tree lawn / right-of-way space in feet, kept as text while typing. */
  rowSpaceFt: string;
  /** "" = not answered yet. */
  placement: PlacementIfNotInRow | "";
  exposure: Exposure | "";
  wireConflict: WireConflict | "";
  /** Free text that goes with wireConflict === "other". */
  wireConflictOther: string;
  preparationRequired: string;
  notes: string;
};

export const EMPTY_SITE_ASSESSMENT: SiteAssessmentValue = {
  rowSpaceFt: "",
  placement: "",
  exposure: "",
  wireConflict: "",
  wireConflictOther: "",
  preparationRequired: "",
  notes: "",
};

/** Fields the person has filled in, for the "Leave this new record?" count. */
export function countFilledSiteAssessmentFields(value: SiteAssessmentValue) {
  return (
    (value.rowSpaceFt.trim() ? 1 : 0) +
    (value.placement ? 1 : 0) +
    (value.exposure ? 1 : 0) +
    (value.wireConflict ? 1 : 0) +
    (value.preparationRequired.trim() ? 1 : 0) +
    (value.notes.trim() ? 1 : 0)
  );
}
