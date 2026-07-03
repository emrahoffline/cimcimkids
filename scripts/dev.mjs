#!/usr/bin/env node
/**
 * Starts Next.js dev server with a clean .next cache.
 */
import { execSync, spawn } from "child_process";
import { rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = join(root, ".next");
const cacheDir = join(root, "node_modules", ".cache");
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

function killPort(port) {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
      stdio: "ignore",
    });
  } catch {
    /* ignore */
  }
}

killPort(3000);
killPort(3001);

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
}
if (existsSync(cacheDir)) {
  rmSync(cacheDir, { recursive: true, force: true });
}

console.log("Starting dev server (clean cache)...");

const child = spawn(process.execPath, [nextBin, "dev", "--turbo", "-H", "127.0.0.1"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    WATCHPACK_POLLING: "true",
    CHOKIDAR_USEPOLLING: "true",
  },
});

child.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
