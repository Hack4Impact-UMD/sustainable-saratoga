export type PropertyOwner = "host" | "other";

export type ContactsValue = {
  hostName: string;
  email: string;
  phone: string;
  /** "" = not answered yet. */
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

/** Email is optional, but if one is entered it has to look like an email. */
export function contactsAreValid(value: ContactsValue) {
  return !value.email.trim() || isValidEmail(value.email);
}

/** Fields the person has filled in, for the "Leave this new record?" count. */
export function countFilledContactFields(value: ContactsValue) {
  return (
    (value.hostName.trim() ? 1 : 0) +
    (value.email.trim() ? 1 : 0) +
    (value.phone.trim() ? 1 : 0) +
    (value.propertyOwner ? 1 : 0)
  );
}
