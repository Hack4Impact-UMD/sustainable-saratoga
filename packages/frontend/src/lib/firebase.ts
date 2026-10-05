import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  firebaseOptions,
  connectAuthEmulatorInDev,
} from "@frontend/lib/firebaseConfig.ts";

const app = initializeApp(firebaseOptions);

export const auth = getAuth(app);

connectAuthEmulatorInDev(auth);
