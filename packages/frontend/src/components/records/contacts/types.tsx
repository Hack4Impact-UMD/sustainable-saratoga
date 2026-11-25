export type PropertyOwner = "host" | "other";

export type ContactsValue = {
  hostName: string;
  email: string;
  phone: string;
  propertyOwner: PropertyOwner | "";
};

export const EMPTY_CONTACTS: ContactsValue = {
  hostName: "",
  email: "",
  phone: "",
  propertyOwner: "",
};

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function contactsAreValid(value: ContactsValue) {
  return !value.email.trim() || isValidEmail(value.email);
}

export function countFilledContactFields(value: ContactsValue) {
  return (
    (value.hostName.trim() ? 1 : 0) +
    (value.email.trim() ? 1 : 0) +
    (value.phone.trim() ? 1 : 0) +
    (value.propertyOwner ? 1 : 0)
  );
}
