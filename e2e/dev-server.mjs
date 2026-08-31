import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pidFile = join(repoRoot, "e2e", ".dev-server.pid");
const isWindows = process.platform === "win32";

const GRACE_MS = 10_000;

function ownedPorts() {
  const config = JSON.parse(
    readFileSync(join(repoRoot, "firebase.json"), "utf8"),
  );
  const configured = Object.values(config.emulators ?? {})
    .map((emulator) => emulator?.port)
    .filter((port) => typeof port === "number");
  const devServerPort = Number.parseInt(
    process.env.E2E_DEV_SERVER_PORT ?? "",
    10,
  );

  return [
    ...new Set([
      ...configured,
      4400,
      ...(Number.isInteger(devServerPort) ? [devServerPort] : []),
    ]),
  ];
}

function processTree(pid) {
  const ps = spawnSync("ps", ["-eo", "pid=,ppid="], { encoding: "utf8" });
  if (ps.error) return [pid];

  const childrenOf = new Map();
  for (const line of (ps.stdout ?? "").split("\n")) {
    const [child, parent] = line.trim().split(/\s+/).map(Number);
    if (!Number.isInteger(child) || !Number.isInteger(parent)) continue;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), child]);
  }

  const tree = [];
  const visit = (current) => {
    for (const child of childrenOf.get(current) ?? []) visit(child);
    tree.push(current);
  };
  visit(pid);

  return tree;
}

function signal(pids, signalName) {
  for (const pid of pids) {
    try {
      process.kill(pid, signalName);
    } catch {
      // Already gone, which is the outcome we wanted.
    }
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForExit(pids, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!pids.some(isAlive)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function terminateTree(pid) {
  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  const tree = processTree(pid);
  signal(tree, "SIGTERM");
  await waitForExit(tree, GRACE_MS);
  signal(tree, "SIGKILL");
}

function killLeftovers() {
  if (isWindows) return;

  const ports = ownedPorts();
  const lsof = spawnSync(
    "lsof",
    ["-t", "-sTCP:LISTEN", ...ports.flatMap((port) => ["-i", `tcp:${port}`])],
    { encoding: "utf8" },
  );

  if (lsof.error) return; // lsof is not installed; nothing else to try.

  const pids = (lsof.stdout ?? "")
    .split("\n")
    .map((line) => Number.parseInt(line, 10))
    .filter((pid) => Number.isInteger(pid) && pid !== process.pid);

  signal(new Set(pids), "SIGKILL");
}

function reapPreviousRun() {
  if (!existsSync(pidFile)) return;

  const pid = Number.parseInt(readFileSync(pidFile, "utf8"), 10);
  if (Number.isInteger(pid) && isAlive(pid))
    signal(processTree(pid), "SIGKILL");
  killLeftovers();
  rmSync(pidFile, { force: true });
}

reapPreviousRun();

const child = spawn("pnpm", ["dev"], {
  cwd: repoRoot,
  stdio: "inherit",
  // Its own process group, so a stray signal to this wrapper's group cannot
  // take the tree down half-way behind our back.
  detached: !isWindows,
});

writeFileSync(pidFile, String(child.pid));

let shuttingDown = false;

async function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (child.pid) await terminateTree(child.pid);
  killLeftovers();
  rmSync(pidFile, { force: true });
  process.exit(code);
}

child.on("exit", (code, signalName) => {
  void shutdown(signalName ? 1 : (code ?? 0));
});

child.on("error", (error) => {
  console.error(error);
  void shutdown(1);
});

for (const signalName of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signalName, () => void shutdown(0));
}

process.on("exit", () => {
  if (shuttingDown) return;
  if (child.pid && !isWindows) signal(processTree(child.pid), "SIGKILL");
  killLeftovers();
  rmSync(pidFile, { force: true });
});
