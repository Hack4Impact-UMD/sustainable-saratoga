import { randomUUID } from "node:crypto";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCaller } from "@backend/routers/index.ts";
import { treeAddressKey } from "@backend/services/records.ts";

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)(
  "records with Firestore",
  () => {
    const suiteId = randomUUID();
    const paths = new Set<string>();
    const volunteerUid = `${suiteId}-volunteer`;
    const adminUid = `${suiteId}-admin`;
    const removedUid = `${suiteId}-removed`;
    let app: ReturnType<typeof initializeApp>;
    let db: ReturnType<typeof getFirestore>;

    const email = (uid: string) => `${uid}@example.com`;
    const recordsAs = (uid: string) =>
      createCaller({
        db,
        auth: getAuth(app),
        session: { uid, email: email(uid), emailVerified: true },
      }).records;

    function address(street: string) {
      const location = {
        address: `${street} ${suiteId}`,
        city: "Saratoga Springs",
        state: "NY",
      };
      paths.add(`treeAddresses/${treeAddressKey(location)}`);
      return location;
    }

    async function create(
      uid: string,
      location: ReturnType<typeof address>,
      fields: Partial<
        Parameters<ReturnType<typeof recordsAs>["create"]>[0]
      > = {},
    ) {
      const record = await recordsAs(uid).create({
        ...location,
        lat: 43.079,
        lng: -73.784,
        status: "requested",
        ...fields,
      });
      paths.add(`trees/${record.id}`);
      return record;
    }

    beforeAll(async () => {
      app = initializeApp({ projectId: "demo-sustainable-saratoga" }, suiteId);
      db = getFirestore(app);
      for (const uid of [volunteerUid, adminUid, removedUid]) {
        const path = `users/${uid}`;
        paths.add(path);
        await db.doc(path).create({
          firstName: "Local",
          lastName: "Tester",
          email: email(uid),
          ...(uid === adminUid
            ? { role: "admin" }
            : { role: "volunteer", volunteerTypes: ["planter"] }),
          // The volunteer also exercises legacy profiles with no explicit status.
          ...(uid === removedUid && { status: "removed" }),
        });
      }
    }, 20_000);

    afterAll(async () => {
      if (!app) return;
      try {
        const batch = db.batch();
        for (const path of paths) batch.delete(db.doc(path));
        await batch.commit();
      } finally {
        await db.terminate();
        await deleteApp(app);
      }
    }, 20_000);

    it("creates, reads and edits a record with server-generated audit values", async () => {
      const location = address("1 Audit Lane");
      const created = await create(volunteerUid, location, {
        siteAssessment: { exposure: "North", nextSteps: "Call tree host" },
        photos: [
          {
            src: "/tree.jpg",
            takenAt: "2026-11-23",
            caption: " Before planting ",
          },
        ],
      });
      expect(created.id).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
      expect(created).toMatchObject({
        origin: "requested",
        status: "requested",
        treeNumber: 1,
        treeCount: 1,
        responsibleMemberUid: volunteerUid,
        recordInformation: {
          createdBy: volunteerUid,
          lastEditedBy: volunteerUid,
        },
        photos: [{ caption: "Before planting" }],
      });
      const audit = created.recordInformation;
      expect(new Date(audit.createdAt).toISOString()).toBe(audit.createdAt);
      expect(audit.lastEditedAt).toBe(audit.createdAt);
      expect(created).not.toHaveProperty("addressKey");
      expect(created).not.toHaveProperty("healthChecks");
      await expect(
        recordsAs(adminUid).get({ id: created.id }),
      ).resolves.toEqual(created);

      const edited = await recordsAs(adminUid).update({
        id: created.id,
        changes: {
          status: "approved",
          siteAssessment: { nextSteps: "Schedule planting" },
          responsibleMemberUid: null,
        },
      });
      expect(edited).toMatchObject({
        id: created.id,
        status: "approved",
        origin: "requested",
        responsibleMemberUid: null,
        siteAssessment: { exposure: "North", nextSteps: "Schedule planting" },
        recordInformation: {
          createdAt: audit.createdAt,
          createdBy: volunteerUid,
          lastEditedBy: adminUid,
        },
      });
      expect(
        Date.parse(edited.recordInformation.lastEditedAt),
      ).toBeGreaterThanOrEqual(Date.parse(audit.lastEditedAt));
      await expect(
        recordsAs(volunteerUid).get({ id: created.id }),
      ).resolves.toEqual(edited);

      const second = await create(adminUid, address("2 Audit Lane"), {
        status: "possible",
        responsibleMemberUid: null,
      });
      expect(second.responsibleMemberUid).toBeNull();
      await expect(
        recordsAs(volunteerUid).update({
          id: second.id,
          changes: { status: "planted", responsibleMemberUid: adminUid },
        }),
      ).resolves.toMatchObject({
        status: "planted",
        origin: "possible",
        responsibleMemberUid: adminUid,
      });
    });

    it("numbers normalized address matches and returns the current count on both reads", async () => {
      const location = address("3 Phila St");
      const records = recordsAs(volunteerUid);
      await expect(records.countAtAddress(location)).resolves.toEqual({
        count: 0,
        nextTreeNumber: 1,
        existingRecordId: null,
      });
      const first = await create(volunteerUid, location);
      await expect(records.countAtAddress(location)).resolves.toEqual({
        count: 1,
        nextTreeNumber: 2,
        existingRecordId: first.id,
      });
      const second = await create(
        adminUid,
        {
          ...location,
          address: `  ${location.address.toUpperCase().replaceAll(" ", "   ")}  `,
        },
        { zip: "12866" },
      );
      expect(second).toMatchObject({ treeNumber: 2, treeCount: 2 });
      const lookup = await records.countAtAddress(location);
      expect(lookup).toMatchObject({ count: 2, nextTreeNumber: 3 });
      expect([first.id, second.id]).toContain(lookup.existingRecordId);
      await expect(records.get({ id: first.id })).resolves.toMatchObject({
        treeNumber: 1,
        treeCount: 2,
      });
      await expect(records.get({ id: second.id })).resolves.toMatchObject({
        treeNumber: 2,
        treeCount: 2,
      });
    });

    it("allocates distinct numbers when two people save at once", async () => {
      const location = address("4 Parallel Ave");
      const saved = await Promise.all([
        create(volunteerUid, location),
        create(adminUid, location),
      ]);
      expect(saved.map((record) => record.treeNumber).sort()).toEqual([1, 2]);
      expect(new Set(saved.map((record) => record.id)).size).toBe(2);
      await expect(
        recordsAs(adminUid).countAtAddress(location),
      ).resolves.toMatchObject({ count: 2, nextTreeNumber: 3 });
    }, 20_000);

    it("moves records atomically and keeps sibling numbers stable", async () => {
      const source = address("5 Source Way");
      const destination = address("6 Destination Way");
      const first = await create(volunteerUid, source);
      const sibling = await create(volunteerUid, source);
      const existing = await create(adminUid, destination);
      const records = recordsAs(adminUid);
      await expect(
        records.update({
          id: first.id,
          changes: { address: destination.address },
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(records.get({ id: first.id })).resolves.toMatchObject({
        address: source.address,
        treeNumber: 1,
        treeCount: 2,
      });
      await expect(records.countAtAddress(destination)).resolves.toMatchObject({
        count: 1,
      });
      const moved = await records.update({
        id: first.id,
        changes: { ...destination, lat: 43.08, lng: -73.79 },
      });
      expect(moved).toMatchObject({
        id: first.id,
        treeNumber: 2,
        treeCount: 2,
        address: destination.address,
      });
      await expect(records.countAtAddress(source)).resolves.toEqual({
        count: 1,
        nextTreeNumber: 3,
        existingRecordId: sibling.id,
      });
      await expect(records.get({ id: sibling.id })).resolves.toMatchObject({
        treeNumber: 2,
        treeCount: 1,
      });
      await expect(records.get({ id: existing.id })).resolves.toMatchObject({
        treeNumber: 1,
        treeCount: 2,
      });
      await expect(create(volunteerUid, source)).resolves.toMatchObject({
        treeNumber: 3,
        treeCount: 2,
      });
    });

    it("rejects invalid assignments and pipeline changes without modifying the record", async () => {
      const location = address("7 Validation Ave");
      const records = recordsAs(volunteerUid);
      const input = {
        ...location,
        lat: 43.079,
        lng: -73.784,
        status: "requested",
      } as const;
      await expect(
        records.create({ ...input, responsibleMemberUid: removedUid }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(records.countAtAddress(location)).resolves.toMatchObject({
        count: 0,
      });
      const created = await create(volunteerUid, location);
      for (const changes of [
        { status: "possible" } as const,
        { responsibleMemberUid: removedUid },
      ]) {
        await expect(
          records.update({ id: created.id, changes }),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      }
      await expect(records.get({ id: created.id })).resolves.toEqual(created);
      await expect(
        recordsAs(adminUid).get({ id: "0000-0000" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        recordsAs(adminUid).update({ id: "0000-0000", changes: {} }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  },
);
