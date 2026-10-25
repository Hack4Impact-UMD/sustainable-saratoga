import type { MapMarker } from "@repo/common";

/**
 * Placeholder points around Saratoga Springs (about 43.08, -73.78).
 * Covers every planting status and more than one year. One marker has no
 * planted year so a year filter can exclude it.
 */
export const mockMapMarkers: MapMarker[] = [
  {
    id: "maple-congress",
    lat: 43.0831,
    lng: -73.7845,
    status: "planted",
    species: "Red maple",
    plantedYear: 2024,
  },
  {
    id: "oak-broadway",
    lat: 43.0812,
    lng: -73.7871,
    status: "planted",
    species: "White oak",
    plantedYear: 2023,
  },
  {
    id: "birch-circular",
    lat: 43.0788,
    lng: -73.7814,
    status: "approved",
    species: "River birch",
    plantedYear: 2024,
  },
  {
    id: "elm-spring",
    lat: 43.0854,
    lng: -73.7789,
    status: "requested",
    species: "American elm",
  },
  {
    id: "pine-lake",
    lat: 43.0766,
    lng: -73.7902,
    status: "not_planted",
    species: "Eastern white pine",
    plantedYear: 2023,
  },
];
