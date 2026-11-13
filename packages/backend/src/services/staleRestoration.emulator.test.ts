// @vitest-environment node
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Auth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { expect, it } from "vitest";
import {
  acceptInvite,
  finishInviteRestoration,
  restoreInviteSignIn,
} from "@backend/services/inviteAcceptance.ts";
import { hashInviteToken } from "@backend/services/inviteManagement.ts";
import { removeAccess } from "@backend/services/people.ts";

const emulators =
  process.env.FIRESTORE_EMULATOR_HOST &&
  process.env.FIREBASE_AUTH_EMULATOR_HOST;

const profileFor = (email: string) => ({
  email,
  firstName: "Review",
  lastName: "Race",
  role: "volunteer" as const,
  volunteerTypes: ["planter" as const],
  status: "active" as const,
});

async function authDisabled(auth: Auth, uid: string) {
  const account = await auth.getUser(uid);
  return account.disabled;
}

async function profileField(user: DocumentReference, field: string) {
  const snapshot = await user.get();
  return snapshot.get(field);
}

function holdAuth(auth: Auth, when: (disabled: boolean) => boolean) {
  let release = () => {};
  let signal = () => {};
  const entered = new Promise<void>((resolve) => {
    signal = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const delayed = {
    updateUser: async (id: string, data: { disabled: boolean }) => {
      if (when(data.disabled)) {
        signal();
        await held;
      }
      return auth.updateUser(id, data);
    },
    getUser: (id: string) => auth.getUser(id),
    revokeRefreshTokens: (id: string) => auth.revokeRefreshTokens(id),
  } as unknown as Auth;
  return {
    delayed,
    entered,
    release: () => {
      release();
    },
  };
}

async function withMember(
  disabled: boolean,
  run: (ctx: {
    db: Firestore;
    auth: Auth;
    uid: string;
    email: string;
    user: DocumentReference;
    invite: () => DocumentReference;
  }) => Promise<void>,
) {
  const app = initializeApp(
    { projectId: "demo-saratoga-review" },
    randomUUID(),
  );
  const db = getFirestore(app);
  const auth = getAuth(app);
  const uid = randomUUID();
  const email = `${uid}@example.com`;
  const user = db.collection("users").doc(uid);
  const extras: DocumentReference[] = [];
  try {
    await auth.createUser({ uid, email, disabled });
    await run({
      db,
      auth,
      uid,
      email,
      user,
      invite: () => {
        const ref = db.collection("invitations").doc(randomUUID());
        extras.push(ref);
        return ref;
      },
    });
  } finally {
    await Promise.all(extras.map((ref) => ref.delete().catch(() => false)));
    await user.delete().catch(() => false);
    await auth.deleteUser(uid).catch(() => false);
    await db.terminate();
    await deleteApp(app);
  }
}

it.skipIf(!emulators)(
  "stale finalizer cannot disable a newly restored account",
  async () => {
    await withMember(true, async ({ db, auth, uid, email, user, invite }) => {
      const old = invite();
      const fresh = invite();
      const profile = profileFor(email);
      const now = Date.now();
      await user.set({
        ...profile,
        status: "removed",
        removedAt: new Date(now - 60000).toISOString(),
      });
      await old.set({
        email,
        role: "volunteer",
        status: "accepted",
        acceptedBy: uid,
        restorationProfile: profile,
        invitedBy: "admin",
        createdAt: new Date(now - 120000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      const gate = holdAuth(auth, () => true);
      const stale = finishInviteRestoration(db, gate.delayed, old.id);
      await Promise.race([gate.entered, stale]);
      await fresh.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      await acceptInvite(db, uid, email, {
        token: fresh.id,
        firstName: "Review",
        lastName: "Race",
      });
      await finishInviteRestoration(db, auth, fresh.id);
      expect(await authDisabled(auth, uid)).toBe(false);
      gate.release();
      await stale;
      expect(await profileField(user, "status")).toBe("active");
      expect(await authDisabled(auth, uid)).toBe(false);
    });
  },
  20000,
);

it.skipIf(!emulators)(
  "a later finalizer pass repairs auth after an obsolete disable lands",
  async () => {
    await withMember(true, async ({ db, auth, uid, email, user, invite }) => {
      const old = invite();
      const fresh = invite();
      const profile = profileFor(email);
      const now = Date.now();
      await user.set({
        ...profile,
        status: "removed",
        removedAt: new Date(now - 60000).toISOString(),
      });
      await old.set({
        email,
        role: "volunteer",
        status: "accepted",
        acceptedBy: uid,
        restorationProfile: profile,
        invitedBy: "admin",
        createdAt: new Date(now - 120000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      await fresh.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      await acceptInvite(db, uid, email, {
        token: fresh.id,
        firstName: "Review",
        lastName: "Race",
      });
      await finishInviteRestoration(db, auth, fresh.id);
      await auth.updateUser(uid, { disabled: true });
      expect(await authDisabled(auth, uid)).toBe(true);
      await finishInviteRestoration(db, auth, old.id);
      expect(await profileField(user, "status")).toBe("active");
      expect(await authDisabled(auth, uid)).toBe(false);
    });
  },
  20000,
);

it.skipIf(!emulators)(
  "delayed enable loses to a newer removal",
  async () => {
    await withMember(true, async ({ db, auth, uid, email, user, invite }) => {
      const fresh = invite();
      const now = Date.now();
      await user.set({
        ...profileFor(email),
        status: "removed",
        removedAt: new Date(now - 60000).toISOString(),
      });
      await fresh.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        createdAt: new Date(now - 30000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      await acceptInvite(db, uid, email, {
        token: fresh.id,
        firstName: "Review",
        lastName: "Race",
      });
      const gate = holdAuth(auth, (disabled) => !disabled);
      const finishing = finishInviteRestoration(db, gate.delayed, fresh.id);
      await Promise.race([gate.entered, finishing]);
      await removeAccess(db, auth, "admin", uid);
      gate.release();
      await finishing;
      expect(await profileField(user, "status")).toBe("removed");
      expect(await profileField(user, "restorationInviteId")).toBeUndefined();
      expect(await authDisabled(auth, uid)).toBe(true);
    });
  },
  20000,
);

it.skipIf(!emulators)(
  "a removal disable cannot outlive a newer restoration",
  async () => {
    await withMember(false, async ({ db, auth, uid, email, user, invite }) => {
      await user.set(profileFor(email));
      const gate = holdAuth(auth, (disabled) => disabled);
      const removal = removeAccess(db, gate.delayed, "admin", uid);
      await Promise.race([gate.entered, removal]);
      const fresh = invite();
      const now = Date.now();
      await fresh.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      await acceptInvite(db, uid, email, {
        token: fresh.id,
        firstName: "Review",
        lastName: "Race",
      });
      await finishInviteRestoration(db, auth, fresh.id);
      expect(await authDisabled(auth, uid)).toBe(false);
      gate.release();
      await removal;
      expect(await profileField(user, "status")).toBe("active");
      expect(await authDisabled(auth, uid)).toBe(false);
    });
  },
  20000,
);

it.skipIf(!emulators)(
  "duplicate finalizers leave the restored account enabled",
  async () => {
    await withMember(true, async ({ db, auth, uid, email, user, invite }) => {
      const fresh = invite();
      const now = Date.now();
      await user.set({
        ...profileFor(email),
        status: "removed",
        removedAt: new Date(now - 60000).toISOString(),
      });
      await fresh.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      await acceptInvite(db, uid, email, {
        token: fresh.id,
        firstName: "Review",
        lastName: "Race",
      });
      await Promise.all([
        finishInviteRestoration(db, auth, fresh.id),
        finishInviteRestoration(db, auth, fresh.id),
      ]);
      expect(await profileField(user, "status")).toBe("active");
      expect(await authDisabled(auth, uid)).toBe(false);
    });
  },
  20000,
);

it.skipIf(!emulators)(
  "an Auth failure leaves restoration pending and a retry finishes it",
  async () => {
    await withMember(true, async ({ db, auth, uid, email, user, invite }) => {
      const fresh = invite();
      const now = Date.now();
      await user.set({
        ...profileFor(email),
        status: "removed",
        removedAt: new Date(now - 60000).toISOString(),
      });
      await fresh.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      await acceptInvite(db, uid, email, {
        token: fresh.id,
        firstName: "Review",
        lastName: "Race",
      });
      let failed = false;
      const flaky = {
        updateUser: (id: string, data: { disabled: boolean }) => {
          if (!failed && data.disabled === false) {
            failed = true;
            return Promise.reject(new Error("Temporary Auth error"));
          }
          return auth.updateUser(id, data);
        },
        getUser: (id: string) => auth.getUser(id),
      } as unknown as Auth;
      await expect(
        finishInviteRestoration(db, flaky, fresh.id),
      ).rejects.toThrow("Temporary Auth error");
      expect(await profileField(user, "status")).toBe("removed");
      expect(await profileField(user, "restorationInviteId")).toBe(fresh.id);
      expect(await authDisabled(auth, uid)).toBe(true);
      await finishInviteRestoration(db, flaky, fresh.id);
      expect(await profileField(user, "status")).toBe("active");
      expect(await profileField(user, "restorationInviteId")).toBeUndefined();
      expect(await authDisabled(auth, uid)).toBe(false);
    });
  },
  20000,
);

it.skipIf(!emulators)(
  "sign-in restoration rejects an invite removed while Auth lookup was pending",
  async () => {
    await withMember(true, async ({ db, auth, uid, email, user, invite }) => {
      const fresh = invite();
      const now = Date.now();
      await user.set({
        ...profileFor(email),
        status: "removed",
        removedAt: new Date(now - 60000).toISOString(),
      });
      await fresh.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        tokenHash: hashInviteToken(fresh.id),
        createdAt: new Date(now - 30000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      let release = () => {};
      let signal = () => {};
      const entered = new Promise<void>((resolve) => {
        signal = resolve;
      });
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const delayed = {
        getUser: async (id: string) => {
          signal();
          await held;
          return auth.getUser(id);
        },
        updateUser: (id: string, data: { disabled: boolean }) =>
          auth.updateUser(id, data),
      } as unknown as Auth;
      const restoring = restoreInviteSignIn(db, delayed, fresh.id);
      const rejected = restoring.catch((error: unknown) => error);
      await entered;
      try {
        await removeAccess(db, auth, "admin", uid);
      } finally {
        release();
      }
      expect(await rejected).toMatchObject({ code: "CONFLICT" });
      expect(await authDisabled(auth, uid)).toBe(true);
      expect(await profileField(user, "desiredAuthDisabled")).toBe(true);
    });
  },
  20000,
);

it.skipIf(!emulators)(
  "retry repairs a delayed enable after restoration payload was cleared and access removed",
  async () => {
    await withMember(true, async ({ db, auth, uid, email, user, invite }) => {
      const fresh = invite();
      const now = Date.now();
      await user.set({
        ...profileFor(email),
        status: "removed",
        removedAt: new Date(now - 60000).toISOString(),
      });
      await fresh.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        createdAt: new Date(now - 30000).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      await acceptInvite(db, uid, email, {
        token: fresh.id,
        firstName: "Review",
        lastName: "Race",
      });
      await finishInviteRestoration(db, auth, fresh.id);
      expect(await profileField(fresh, "restorationProfile")).toBeUndefined();
      await removeAccess(db, auth, "admin", uid);
      // Model a previously issued enable landing after its caller lost the response.
      await auth.updateUser(uid, { disabled: false });
      await finishInviteRestoration(db, auth, fresh.id);
      expect(await profileField(user, "status")).toBe("removed");
      expect(await authDisabled(auth, uid)).toBe(true);
    });
  },
  20000,
);
