import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  reconcileMemberAuth,
  syncMemberAuth,
} from "@backend/services/memberAuth.ts";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { finishInviteRestoration } from "@backend/services/inviteAcceptance.ts";
import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import { createApp } from "@backend/app.ts";

initializeApp();

// Caps concurrent containers so an unexpected traffic spike degrades
// performance instead of the bill. Raise it when you need the throughput.
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

export const api = onRequest(createApp());

export const restoreInvitedMember = onDocumentUpdated(
  { document: "invitations/{inviteId}", retry: true },
  async (event) => {
    if (
      event.data?.after.get("restorationProfile") &&
      !event.data.before.get("restorationProfile")
    ) {
      await finishInviteRestoration(
        getFirestore(),
        getAuth(),
        event.params.inviteId,
      );
    }
  },
);

export type { AppRouter } from "@backend/routers/index.ts";

export const reconcileMemberAccounts = onSchedule(
  "every 1 minutes",
  async () => {
    await reconcileMemberAuth(getFirestore(), getAuth());
  },
);

export const syncMemberAccount = onDocumentUpdated(
  { document: "users/{uid}", retry: true },
  async (event) => {
    if (
      event.data?.before.get("authRevision") !==
      event.data?.after.get("authRevision")
    ) {
      await syncMemberAuth(getFirestore(), getAuth(), event.params.uid);
    }
  },
);
