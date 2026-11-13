// @vitest-environment node
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { expect, it } from "vitest";
import {
  acceptInvite,
  finishInviteRestoration,
} from "@backend/services/inviteAcceptance.ts";
import { removeAccess } from "@backend/services/people.ts";

it.skipIf(
  !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST,
)(
  "later removal defeats a restoration using real emulator transactions",
  async () => {
    const app = initializeApp(
      { projectId: "demo-sustainable-saratoga" },
      `race-${randomUUID()}`,
    );
    const db = getFirestore(app);
    const auth = getAuth(app);
    const uid = `race-${randomUUID()}`;
    const token = `invite-${randomUUID()}`;
    const email = `${uid}@example.org`;
    const user = db.collection("users").doc(uid);
    const invite = db.collection("invitations").doc(token);
    const olderInvite = db.collection("invitations").doc(`old-${token}`);
    const sent = new Date(Date.now() - 60_000).toISOString();
    try {
      await auth.createUser({ uid, email, disabled: true });
      await user.set({
        email,
        firstName: "Race",
        lastName: "Member",
        role: "volunteer",
        volunteerTypes: ["planter"],
        status: "removed",
        removedAt: new Date(Date.now() - 120_000).toISOString(),
      });
      await invite.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        createdAt: sent,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      });
      await acceptInvite(db, uid, email, {
        token,
        firstName: "Race",
        lastName: "Member",
      });
      await removeAccess(db, auth, "admin", uid);
      await finishInviteRestoration(db, auth, token);
      const result = await user.get();
      expect(result.get("status")).toBe("removed");
      expect(result.get("restorationInviteId")).toBeUndefined();
      await olderInvite.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        createdAt: sent,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      });
      await expect(
        acceptInvite(db, uid, email, {
          token: olderInvite.id,
          firstName: "Race",
          lastName: "Member",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      const account = await auth.getUser(uid);
      expect(account.disabled).toBe(true);
    } finally {
      await olderInvite.delete();
      await invite.delete();
      await user.delete();
      await auth.deleteUser(uid);
      await db.terminate();
      await deleteApp(app);
    }
  },
);
