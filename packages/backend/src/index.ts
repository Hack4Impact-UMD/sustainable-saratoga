import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import { createApp } from "@backend/app.ts";

initializeApp();

// Caps concurrent containers so an unexpected traffic spike degrades
// performance instead of the bill. Raise it when you need the throughput.
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

export const api = onRequest(createApp());

export type { AppRouter } from "@backend/routers/index.ts";
