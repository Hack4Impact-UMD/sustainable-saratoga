// Loads mock accounts and invites into the local Firebase emulators.
//
//   pnpm seed                         (emulators already running)
//   node scripts/seed.mjs --wait      (used by `pnpm dev`: waits for them first)
//
// Emulator only. The hosts below are always set to localhost, so the Admin SDK
// can't reach a real Firebase project, and the project ID is a `demo-` one,
// which Firebase never connects to production.
// The accounts are listed in src/dev/seed.ts.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "..", "..");
const wait = process.argv.includes("--wait");

const { emulators } = JSON.parse(
  await readFile(join(repoRoot, "firebase.json"), "utf8"),
);
const authHost = `127.0.0.1:${emulators.auth.port}`;
const firestoreHost = `127.0.0.1:${emulators.firestore.port}`;

process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;
process.env.GCLOUD_PROJECT = "demo-sustainable-saratoga";
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
// skip the Google Cloud metadata lookup, which only matters on real servers
process.env.METADATA_SERVER_DETECTION = "none";

/** True once the emulator answers HTTP at all. */
async function isUp(host) {
  try {
    await fetch(`http://${host}/`);
    return true;
  } catch {
    return false;
  }
}

if (wait) {
  const deadline = Date.now() + 3 * 60 * 1000;
  while (!((await isUp(authHost)) && (await isUp(firestoreHost)))) {
    if (Date.now() > deadline) {
      console.error("Seed: the emulators didn't start within 3 minutes.");
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
} else if (!((await isUp(authHost)) && (await isUp(firestoreHost)))) {
  console.error(
    "Seed: start the emulators first (pnpm dev or pnpm emulators).",
  );
  process.exit(1);
}

// Bundle the TypeScript seed (it imports @repo/common) and run it.
const result = await esbuild.build({
  entryPoints: [join(packageRoot, "src/dev/runSeed.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["firebase-admin"],
  write: false,
  logLevel: "warning",
});
const outFile = join(packageRoot, "node_modules/.cache/seed/runSeed.mjs");
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, result.outputFiles[0].text);

try {
  await import(pathToFileURL(outFile).href);
} catch (error) {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
