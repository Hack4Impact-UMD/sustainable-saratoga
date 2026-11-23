import { createHash, randomBytes } from "node:crypto";
import { type } from "arktype";
import { TRPCError } from "@trpc/server";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { recordPipelineState, treeDocument, userProfile } from "@repo/common";
import type {
  CreateTreeRecordInput,
  SavedTreeRecord,
  TreeAddress,
  TreeDocument,
  UpdateTreeRecordInput,
} from "@repo/common";

const addressGroup = type({
  count: "number.safe >= 0",
  nextTreeNumber: "number.safe >= 1",
});
const emptyAddressGroup = { count: 0, nextTreeNumber: 1 };

export function treeAddressKey({ address, city, state }: TreeAddress): string {
  const parts = [address, city, state].map((part) =>
    part.trim().replace(/\s+/g, " ").toLowerCase(),
  );
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function toSavedRecord(
  { addressKey: _addressKey, ...record }: TreeDocument,
  treeCount: number,
): SavedTreeRecord {
  return { ...record, treeCount };
}

async function requireActiveAssignee(
  db: Firestore,
  transaction: Transaction,
  uid: string | null,
): Promise<void> {
  if (uid === null) return;
  const snapshot = await transaction.get(db.collection("users").doc(uid));
  if (
    !snapshot.exists ||
    userProfile.assert(snapshot.data()).status !== "active"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose an active member or leave the record unassigned.",
    });
  }
}

export function getTreeRecord(
  db: Firestore,
  id: string,
): Promise<SavedTreeRecord> {
  return db.runTransaction(
    async (transaction) => {
      const snapshot = await transaction.get(db.collection("trees").doc(id));
      if (!snapshot.exists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Record not found.",
        });
      }
      const record = treeDocument.assert(snapshot.data());
      const group = await transaction.get(
        db.collection("treeAddresses").doc(record.addressKey),
      );
      return toSavedRecord(record, addressGroup.assert(group.data()).count);
    },
    { readOnly: true },
  );
}

export function countTreesAtAddress(db: Firestore, address: TreeAddress) {
  const addressKey = treeAddressKey(address);
  const groupRef = db.collection("treeAddresses").doc(addressKey);
  return db.runTransaction(
    async (transaction) => {
      const groupSnapshot = await transaction.get(groupRef);
      const group = groupSnapshot.exists
        ? addressGroup.assert(groupSnapshot.data())
        : emptyAddressGroup;
      if (group.count === 0) return { ...group, existingRecordId: null };

      const records = await transaction.get(
        db.collection("trees").where("addressKey", "==", addressKey).limit(1),
      );
      return { ...group, existingRecordId: records.docs[0]?.id ?? null };
    },
    { readOnly: true },
  );
}

export async function createTreeRecord(
  db: Firestore,
  actorUid: string,
  input: CreateTreeRecordInput,
): Promise<SavedTreeRecord> {
  const addressKey = treeAddressKey(input);
  const groupRef = db.collection("treeAddresses").doc(addressKey);
  const responsibleMemberUid =
    input.responsibleMemberUid === undefined
      ? actorUid
      : input.responsibleMemberUid;

  // A document create precondition protects the ID even if a collision races this write.
  for (let attempt = 0; attempt < 5; attempt++) {
    const hex = randomBytes(4).toString("hex").toUpperCase();
    const id = `${hex.slice(0, 4)}-${hex.slice(4)}`;
    const ref = db.collection("trees").doc(id);
    const saved = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return null;

      const groupSnapshot = await transaction.get(groupRef);
      const group = groupSnapshot.exists
        ? addressGroup.assert(groupSnapshot.data())
        : emptyAddressGroup;
      await requireActiveAssignee(db, transaction, responsibleMemberUid);

      const now = new Date().toISOString();
      const record = treeDocument.assert({
        ...input,
        id,
        addressKey,
        origin: input.status,
        treeNumber: group.nextTreeNumber,
        responsibleMemberUid,
        photos: input.photos ?? [],
        recordInformation: {
          createdAt: now,
          createdBy: actorUid,
          lastEditedAt: now,
          lastEditedBy: actorUid,
        },
      });
      const count = group.count + 1;
      transaction.create(ref, record);
      transaction.set(groupRef, {
        count,
        nextTreeNumber: group.nextTreeNumber + 1,
      });
      return toSavedRecord(record, count);
    });
    if (saved) return saved;
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Could not allocate a unique record ID.",
  });
}

export function updateTreeRecord(
  db: Firestore,
  actorUid: string,
  { id, changes }: UpdateTreeRecordInput,
): Promise<SavedTreeRecord> {
  const ref = db.collection("trees").doc(id);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Record not found." });
    }

    const current = treeDocument.assert(snapshot.data());
    const next = { ...current, ...changes };
    const state = recordPipelineState({
      origin: current.origin,
      status: next.status,
    });
    if (state instanceof type.errors) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose a status in this record's starting pipeline.",
      });
    }

    const addressKey = treeAddressKey(next);
    const moved = addressKey !== current.addressKey;
    if (moved && (changes.lat === undefined || changes.lng === undefined)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Place the exact pin at the new address.",
      });
    }
    if (
      changes.responsibleMemberUid !== undefined &&
      changes.responsibleMemberUid !== current.responsibleMemberUid
    ) {
      await requireActiveAssignee(
        db,
        transaction,
        changes.responsibleMemberUid,
      );
    }

    const groups = db.collection("treeAddresses");
    const sourceRef = groups.doc(current.addressKey);
    const sourceSnapshot = await transaction.get(sourceRef);
    const source = addressGroup.assert(sourceSnapshot.data());
    const destinationRef = groups.doc(addressKey);
    const destination = moved ? await transaction.get(destinationRef) : null;
    const target = destination?.exists
      ? addressGroup.assert(destination.data())
      : emptyAddressGroup;

    const record = treeDocument.assert({
      ...next,
      addressKey,
      treeNumber: moved ? target.nextTreeNumber : current.treeNumber,
      ...(changes.location && {
        location: { ...current.location, ...changes.location },
      }),
      ...(changes.siteAssessment && {
        siteAssessment: {
          ...current.siteAssessment,
          ...changes.siteAssessment,
        },
      }),
      ...(changes.plantingPreparation && {
        plantingPreparation: {
          ...current.plantingPreparation,
          ...changes.plantingPreparation,
        },
      }),
      ...(changes.contacts && {
        contacts: { ...current.contacts, ...changes.contacts },
      }),
      ...(changes.eventPlantingDetails && {
        eventPlantingDetails: {
          ...current.eventPlantingDetails,
          ...changes.eventPlantingDetails,
        },
      }),
      recordInformation: {
        ...current.recordInformation,
        lastEditedAt: new Date().toISOString(),
        lastEditedBy: actorUid,
      },
    });
    transaction.set(ref, record);
    if (moved) {
      transaction.update(sourceRef, { count: source.count - 1 });
      transaction.set(destinationRef, {
        count: target.count + 1,
        nextTreeNumber: target.nextTreeNumber + 1,
      });
    }
    return toSavedRecord(record, moved ? target.count + 1 : source.count);
  });
}
