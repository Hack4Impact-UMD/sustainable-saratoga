import { type } from "arktype";
import { userRole } from "@common/user.ts";

// An invite document at invitations/{id}. The invitations backend creates
// these; people.list only reads them.
export const invitationStatus = type("'pending' | 'accepted' | 'canceled'");

export const invitation = type({
  email: "string.email",
  role: userRole,
  "firstName?": "string",
  "lastName?": "string",
  status: invitationStatus,
  // ISO timestamps; field names match the Invite spec in the invitations task
  createdAt: "string",
  expiresAt: "string",
  invitedBy: "string",
});

// what the people list shows. "expired" is derived from expiresAt, never stored
export const personStatus = type("'pending' | 'expired' | 'active'");

export const person = type({
  // invitation id for invites, uid for members
  id: "string",
  name: "string",
  email: "string",
  role: userRole,
  status: personStatus,
  // only invites have these (ISO timestamps)
  invitedAt: "string | null",
  expiresAt: "string | null",
  isSelf: "boolean",
});

export const removeAccessInput = type({
  uid: "string > 0",
});

export type InvitationStatus = typeof invitationStatus.infer;
export type Invitation = typeof invitation.infer;
export type PersonStatus = typeof personStatus.infer;
export type Person = typeof person.infer;
export type RemoveAccessInput = typeof removeAccessInput.infer;
