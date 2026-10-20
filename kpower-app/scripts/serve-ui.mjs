/**
 * Static UI server for packaged installs (serves Vite dist on :1420).
 * HID telemetry stays on 127.0.0.1:3921 via ups-hid-bridge.mjs.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "dist");
const host = "127.0.0.1";
const port = Number(process.env.KPOWER_UI_PORT || 1420);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": status === 200 ? "public, max-age=60" : "no-store",
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let rel = urlPath === "/" ? "/index.html" : urlPath;
  let file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(root, "index.html");
  }
  if (!fs.existsSync(file)) {
    send(res, 404, "Not found");
    return;
  }
  const ext = path.extname(file).toLowerCase();
  send(res, 200, fs.readFileSync(file), TYPES[ext] || "application/octet-stream");
});

server.on("error", (err) => {
  console.error("[serve-ui]", err.message);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`[serve-ui] http://${host}:${port}  (root ${root})`);
});
