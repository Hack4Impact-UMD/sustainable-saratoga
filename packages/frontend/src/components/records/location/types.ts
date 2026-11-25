export type LatLng = { lat: number; lng: number };

export type Ownership = "dpw" | "private";

export type LocationValue = {
  address: string;
  pin: LatLng | null;
  description: string;
  ownership: Ownership | "";
};

export const EMPTY_LOCATION: LocationValue = {
  address: "",
  pin: null,
  description: "",
  ownership: "",
};

export function splitAddress(address: string): {
  street: string;
  locality: string;
} {
  const index = address.indexOf(",");
  if (index === -1) return { street: address, locality: "" };
  return {
    street: address.slice(0, index).trim(),
    locality: address.slice(index + 1).trim(),
  };
}

export function countFilledLocationFields(value: LocationValue) {
  return (
    (value.address.trim() ? 1 : 0) +
    (value.pin ? 1 : 0) +
    (value.description.trim() ? 1 : 0) +
    (value.ownership ? 1 : 0)
  );
}