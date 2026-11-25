export type TreeSpeciesValue = {
  species: string;
  cultivar: string;
};

export const EMPTY_TREE_SPECIES: TreeSpeciesValue = {
  species: "",
  cultivar: "",
};

export function countFilledTreeSpeciesFields(value: TreeSpeciesValue) {
  return (
    (value.species.trim() ? 1 : 0) +
    (value.cultivar.trim() ? 1 : 0)
  );
}