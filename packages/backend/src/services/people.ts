import { TRPCError } from "@trpc/server";
import type { Auth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { invitation, userProfile } from "@repo/common";
import type { Person } from "@repo/common";
import {
  bumpedAuthRevision,
  syncMemberAuth,
} from "@backend/services/memberAuth.ts";

const fullName = (first?: string, last?: string) =>
  [first, last].filter(Boolean).join(" ");

/**
 * Pending and expired invites first (newest invite first), then active
 * members by name. Removed members and canceled or accepted invites are left
 * out.
 */
export async function listPeople(
  db: Firestore,
  selfUid: string,
  now: Date = new Date(),
): Promise<Person[]> {
  const [invites, users] = await Promise.all([
    db.collection("invitations").where("status", "==", "pending").get(),
    db.collection("users").get(),
  ]);

  const inviteRows = invites.docs
    .map((snapshot): Person => {
      const invite = invitation.assert(snapshot.data());
      return {
        id: snapshot.id,
        name: fullName(invite.firstName, invite.lastName),
        email: invite.email,
        role: invite.role,
        status: new Date(invite.expiresAt) <= now ? "expired" : "pending",
        invitedAt: invite.lastSentAt ?? invite.createdAt,
        expiresAt: invite.expiresAt,
        isSelf: false,
      };
    })
    .sort((a, b) => (b.invitedAt ?? "").localeCompare(a.invitedAt ?? ""));

  // filtered here rather than with where("status", "!=", "removed"), which
  // would skip older profiles that have no status field
  const memberRows = users.docs
    .map((snapshot) => ({
      uid: snapshot.id,
      profile: userProfile.assert(snapshot.data()),
    }))
    .filter(({ profile }) => profile.status === "active")
    .map(({ uid, profile }): Person => ({
      id: uid,
      name: fullName(profile.firstName, profile.lastName),
      email: profile.email,
      role: profile.role,
      status: "active",
      invitedAt: null,
      expiresAt: null,
      isSelf: uid === selfUid,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...inviteRows, ...memberRows];
}

/**
 * Locks a member out. The profile is marked removed, never deleted, so their
 * records stay credited to them. The profile is written first: if a later Auth
 * step fails, the member is already refused by `protectedProcedure`, and
 * calling this again finishes the Auth steps. Auth itself is applied by
 * `syncMemberAuth`, which repairs a disable that lands after a newer invite
 * has already restored the account.
 */
export async function removeAccess(
  db: Firestore,
  auth: Auth,
  actorUid: string,
  targetUid: string,
  now: Date = new Date(),
): Promise<void> {
  if (targetUid === actorUid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Admins can't remove their own access.",
    });
  }

  const ref = db.collection("users").doc(targetUid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No such member." });
    }
    const raw = snapshot.data();
    const profile = userProfile.assert(raw);
    const previous = profile.removedAt ? Date.parse(profile.removedAt) : 0;
    const removedAt = new Date(
      Math.max(now.getTime(), Number.isFinite(previous) ? previous + 1 : 0),
    ).toISOString();
    transaction.update(ref, {
      status: "removed",
      removedAt,
      removedBy: actorUid,
      restorationInviteId: FieldValue.delete(),
      desiredAuthDisabled: true,
      authRevision: bumpedAuthRevision(raw),
    });
  });

  await syncMemberAuth(db, auth, targetUid);
  await auth.revokeRefreshTokens(targetUid);
}
