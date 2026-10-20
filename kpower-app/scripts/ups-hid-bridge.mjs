/**
 * Live MGE/Eaton USB HID UPS bridge (VID 0463 / PID 0001).
 * Serves real telemetry on http://127.0.0.1:3921/snapshot
 * Close nothing required — opens the HID device shared with stock KPower.
 */
import http from "node:http";
import HID from "node-hid";

const HOST = "127.0.0.1";
const PORT = 3921;
const VID = 0x0463;
const PID = 0x0001;
const POLL_MS = 1000;

function u16le(buf, i) {
  return buf[i] | (buf[i + 1] << 8);
}

function findDevice() {
  return HID.devices().find((d) => d.vendorId === VID && d.productId === PID);
}

/**
 * Feature report 1 layout (observed vs stock KPower Data tab):
 *  [0]    report id
 *  [1..2] input voltage ×10
 *  [3..4] output voltage ×10
 *  [5..6] secondary voltage ×10
 *  [7..8] battery single voltage ×100
 *  [9]    UPS load %
 *  [10..11] input frequency ×10
 *  [12..13] temperature ×10 °C
 *  [14..15] battery capacity %
 *  [16..17] runtime minutes
 *  [18..19] status flags
 */
function decodeReport1(raw) {
  const r = Buffer.from(raw);
  if (r.length < 19 || r[0] !== 0x01) return null;

  const inputVoltage = u16le(r, 1) / 10;
  const outputVoltage = u16le(r, 3) / 10;
  const batterySingleVoltage = u16le(r, 7) / 100;
  const loadPercent = r[9];
  const frequency = u16le(r, 10) / 10;
  const temperatureC = u16le(r, 12) / 10;
  const batteryPercent = u16le(r, 14);
  const runtimeMinutes = u16le(r, 16);
  const flags = u16le(r, 18);

  const onBattery = inputVoltage < 50;
  const mode = onBattery ? "battery" : "line";

  return {
    connected: true,
    mode,
    loadPercent,
    batteryPercent,
    runtimeSeconds: runtimeMinutes * 60,
    inputVoltage,
    outputVoltage,
    frequency,
    batterySingleVoltage,
    temperatureC,
    alarmCodes: onBattery ? ["ON_BATTERY"] : [],
    timestampMs: Date.now(),
    source: "hid",
    flags,
  };
}

function offlineSnapshot(reason) {
  return {
    connected: false,
    mode: "unknown",
    loadPercent: 0,
    batteryPercent: 0,
    runtimeSeconds: 0,
    inputVoltage: 0,
    outputVoltage: 0,
    frequency: 0,
    batterySingleVoltage: 0,
    temperatureC: 0,
    alarmCodes: [],
    timestampMs: Date.now(),
    source: "hid",
    error: reason,
  };
}

let latest = offlineSnapshot("starting");
let device = null;

function openDevice() {
  if (device) {
    try {
      device.close();
    } catch {
      /* ignore */
    }
    device = null;
  }
  const info = findDevice();
  if (!info) {
    latest = offlineSnapshot("MGE USB UPS (VID_0463/PID_0001) not found");
    return false;
  }
  try {
    device = new HID.HID(info.path);
    return true;
  } catch (err) {
    latest = offlineSnapshot(`HID open failed: ${err.message}`);
    return false;
  }
}

function poll() {
  try {
    if (!device && !openDevice()) return;
    const raw = device.getFeatureReport(1, 64);
    const snap = decodeReport1(raw);
    if (!snap) {
      latest = offlineSnapshot("Unexpected feature report layout");
      return;
    }
    latest = snap;
  } catch (err) {
    latest = offlineSnapshot(`HID read failed: ${err.message}`);
    try {
      device?.close();
    } catch {
      /* ignore */
    }
    device = null;
  }
}

openDevice();
poll();
setInterval(poll, POLL_MS);

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, connected: latest.connected, source: "hid" }));
    return;
  }
  if (req.url === "/snapshot" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(latest));
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, HOST, () => {
  console.log(`[ups-hid-bridge] real HID telemetry on http://${HOST}:${PORT}/snapshot`);
  console.log(`[ups-hid-bridge] device: ${latest.connected ? "online" : latest.error}`);
});
