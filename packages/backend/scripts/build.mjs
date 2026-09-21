import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(packageRoot, "dist");
const watch = process.argv.includes("--watch");

const manifest = JSON.parse(
  await readFile(join(packageRoot, "package.json"), "utf8"),
);

/**
 * Kept out of the bundle. The Cloud Functions runtime loads
 * `firebase-functions` itself to discover the exported functions, and
 * `firebase-admin` pulls in native gRPC code that must not be inlined.
 * Everything else -- including `@repo/common` -- is bundled, so the deploy
 * artifact never sees a `workspace:*` dependency.
 */
const external = ["firebase-functions", "firebase-admin"];

/** @type {import("esbuild").BuildOptions} */
const options = {
  entryPoints: [join(packageRoot, "src/index.ts")],
  outfile: join(outDir, "index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  minify: false,
  external,
  logLevel: "info",
  // Some bundled CommonJS dependencies (Express) call `require`, which does
  // not exist in an ES module. Recreate it from `import.meta.url`.
  banner: {
    js: [
      'import { createRequire as __createRequire } from "node:module";',
      "const require = __createRequire(import.meta.url);",
    ].join("\n"),
  },
};

async function writeDeployManifest() {
  await mkdir(outDir, { recursive: true });
  const dependencies = Object.fromEntries(
    external.map((name) => [name, manifest.dependencies[name]]),
  );
  await writeFile(
    join(outDir, "package.json"),
    `${JSON.stringify(
      {
        name: "backend-deploy",
        private: true,
        type: "module",
        main: "index.js",
        engines: { node: "22" },
        dependencies,
      },
      null,
      2,
    )}\n`,
  );
}

await writeDeployManifest();

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
  console.log("[backend] watching for changes");
} else {
  await esbuild.build(options);
}
