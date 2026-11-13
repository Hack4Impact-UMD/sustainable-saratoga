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
import {
  reconcileMemberAuth,
  syncMemberAuth,
} from "@backend/services/memberAuth.ts";
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
    { projectId: `demo-race-${randomUUID().slice(0, 8)}` },
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
        revokeRefreshTokens: (id: string) => auth.revokeRefreshTokens(id),
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

it.skipIf(!emulators)(
  "sweep repairs late writes after completed operations without a user retry",
  async () => {
    await withMember(false, async ({ db, auth, uid, email, user, invite }) => {
      await user.set(profileFor(email));
      await removeAccess(db, auth, "admin", uid);
      // Simulate an orphaned enable landing after its caller died and removal completed.
      await auth.updateUser(uid, { disabled: false });
      await reconcileMemberAuth(db, auth);
      expect(await authDisabled(auth, uid)).toBe(true);
      const fresh = invite();
      const now = Date.now();
      await fresh.set({
        email,
        role: "volunteer",
        status: "pending",
        invitedBy: "admin",
        createdAt: new Date(now + 1).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
      });
      await acceptInvite(db, uid, email, {
        token: fresh.id,
        firstName: "Review",
        lastName: "Race",
      });
      await reconcileMemberAuth(db, auth);
      expect(await profileField(user, "status")).toBe("active");
      expect(await profileField(fresh, "restorationProfile")).toBeUndefined();
      expect(await profileField(user, "authRevision")).toBeGreaterThan(1);
      // An orphaned old disable lands after all restoration callers completed.
      await auth.updateUser(uid, { disabled: true });
      await Promise.all([
        reconcileMemberAuth(db, auth),
        reconcileMemberAuth(db, auth),
      ]);
      expect(await authDisabled(auth, uid)).toBe(false);
    });
  },
  20000,
);

it.skipIf(!emulators)(
  "sweep never unlocks a removed account from an unbacked false flag",
  async () => {
    await withMember(false, async ({ db, auth, uid, email, user }) => {
      await user.set({
        ...profileFor(email),
        status: "removed",
        removedAt: new Date().toISOString(),
        desiredAuthDisabled: false,
        authRevision: 2,
      });
      await reconcileMemberAuth(db, auth);
      expect(await authDisabled(auth, uid)).toBe(true);
    });
  },
  20000,
);

it.skipIf(!emulators)(
  "sweep retries failed token revocation and leaves unmanaged active accounts untouched",
  async () => {
    await withMember(true, async ({ db, auth, uid, email, user }) => {
      await user.set(profileFor(email));
      await reconcileMemberAuth(db, auth);
      expect(await authDisabled(auth, uid)).toBe(true);
      let fail = true;
      const flaky = {
        updateUser: (id: string, data: { disabled: boolean }) =>
          auth.updateUser(id, data),
        getUser: (id: string) => auth.getUser(id),
        revokeRefreshTokens: (id: string) => {
          if (fail) {
            fail = false;
            return Promise.reject(new Error("revocation unavailable"));
          }
          return auth.revokeRefreshTokens(id);
        },
      } as unknown as Auth;
      await expect(removeAccess(db, flaky, "admin", uid)).rejects.toThrow(
        "revocation unavailable",
      );
      expect(await profileField(user, "authRevokedRemoval")).toBeUndefined();
      await reconcileMemberAuth(db, flaky);
      expect(await profileField(user, "authRevokedRemoval")).toBe(
        await profileField(user, "removedAt"),
      );
      expect(await authDisabled(auth, uid)).toBe(true);
      await syncMemberAuth(db, flaky, uid);
    });
  },
  20000,
);

it.skipIf(!emulators).each(["canceled", "expired", "replaced", "new-removal"])(
  "sweep invalidates %s unlock intent",
  async (change) => {
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
      await restoreInviteSignIn(db, auth, fresh.id);
      expect(await authDisabled(auth, uid)).toBe(false);
      if (change === "canceled") await fresh.update({ status: "canceled" });
      if (change === "expired")
        await fresh.update({ expiresAt: new Date(now - 1).toISOString() });
      if (change === "replaced")
        await fresh.update({ tokenHash: hashInviteToken("replacement") });
      if (change === "new-removal") await removeAccess(db, auth, "admin", uid);
      await reconcileMemberAuth(db, auth);
      expect(await authDisabled(auth, uid)).toBe(true);
      expect(await profileField(user, "status")).toBe("removed");
    });
  },
  20000,
);

it.skipIf(!emulators)(
  "obsolete unlock caller cannot roll back a newer valid unlock",
  async () => {
    await withMember(true, async ({ db, auth, uid, email, user, invite }) => {
      const old = invite(),
        fresh = invite();
      const now = Date.now();
      await user.set({
        ...profileFor(email),
        status: "removed",
        removedAt: new Date(now - 60000).toISOString(),
      });
      for (const ref of [old, fresh])
        await ref.set({
          email,
          role: "volunteer",
          status: "pending",
          invitedBy: "admin",
          tokenHash: hashInviteToken(ref.id),
          createdAt: new Date(now - 30000).toISOString(),
          expiresAt: new Date(now + 86400000).toISOString(),
        });
      const gate = holdAuth(auth, (disabled) => !disabled);
      const stale = restoreInviteSignIn(db, gate.delayed, old.id).catch(
        (error: unknown) => error,
      );
      await gate.entered;
      try {
        await old.update({ status: "canceled" });
        await restoreInviteSignIn(db, auth, fresh.id);
      } finally {
        gate.release();
      }
      expect(await stale).toMatchObject({ code: "CONFLICT" });
      expect(await profileField(user, "authUnlock")).toMatchObject({
        inviteId: fresh.id,
      });
      expect(await authDisabled(auth, uid)).toBe(false);
    });
  },
  20000,
);
