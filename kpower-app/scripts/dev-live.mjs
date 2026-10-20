/**
 * Starts the real HID bridge + Vite together.
 * Usage: npm run dev:live
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(root, "..");

function run(cmd, args, name) {
  const child = spawn(cmd, args, {
    cwd: appRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  child.on("exit", (code) => {
    console.log(`[${name}] exited ${code}`);
    process.exit(code ?? 1);
  });
  return child;
}

const bridge = run(process.execPath, ["scripts/ups-hid-bridge.mjs"], "hid");
const vite = run("npx", ["vite"], "vite");

function shutdown() {
  bridge.kill();
  vite.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
