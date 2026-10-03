import { spawn } from "node:child_process";

const child = spawn("pnpm", ["--filter", "@repo/frontend", "dev", "--host", "127.0.0.1", "--port", process.env.E2E_DEV_SERVER_PORT ?? "5173"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

const forwardSignal = (signal) => {
  if (!child.killed) child.kill(signal);
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));
process.on("exit", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
