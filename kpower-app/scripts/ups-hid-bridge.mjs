/**
 * Live MGE/Eaton USB HID UPS bridge (VID 0463 / PID 0001).
 *
 * GET  /snapshot  — telemetry (feature report 1)
 * POST /command   — Megatec control via feature report 0x06
 * POST /mail/test — optional SMTP test (nodemailer)
 *
 * Control mapping (Megatec, observed to start self-test while stock kpowerd logs):
 *   T / TL / Tnn / CT / Snn / C / BZOFF|BZON
 */
import http from "node:http";
import HID from "node-hid";
import {
  bindSnapshotGetter,
  getTelegramConfig,
  loadTelegramConfigFromDisk,
  saveTelegramConfig,
  startTelegramPolling,
  watchPowerEvents,
} from "./telegram-bot.mjs";

const HOST = "127.0.0.1";
const PORT = 3921;
const VID = 0x0463;
const PID = 0x0001;
const POLL_MS = 1000;
/** Feature report used for Megatec ASCII ( empirically starts self-test ). */
const CMD_REPORT_ID = 0x06;

function u16le(buf, i) {
  return buf[i] | (buf[i + 1] << 8);
}

function findDevice() {
  return HID.devices().find((d) => d.vendorId === VID && d.productId === PID);
}

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

  return {
    connected: true,
    mode: onBattery ? "battery" : "line",
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

/** Map app control ids → Megatec ASCII. */
export function megatecForCommand(command, minutes) {
  const n = Number.isFinite(minutes) ? Math.max(0, Math.min(99, Math.floor(minutes))) : undefined;
  switch (command) {
    case "selfTest10s":
      return "T";
    case "selfTestEod":
      return "TL";
    case "selfTestMinutes": {
      const m = Math.max(1, Math.min(99, n ?? 10));
      return `T${String(m).padStart(2, "0")}`;
    }
    case "selfTestCancel":
      return "CT";
    case "closeOutputMinutes": {
      const m = Math.max(0, Math.min(9, n ?? 1));
      return m === 0 ? "S.2" : `S${String(m).padStart(2, "0")}`;
    }
    case "closeOutputCancel":
      return "C";
    case "buzzerToggle":
      return "BZOFF";
    case "selfTest": // schedule alias
      return "T";
    case "buzzerMute":
      return "BZOFF";
    case "upsOff":
      return "S.2";
    default:
      return null;
  }
}

function sendMegatec(ascii) {
  const info = findDevice();
  if (!info) throw new Error("MGE USB UPS not found");
  const dev = new HID.HID(info.path);
  try {
    const buf = Buffer.alloc(8, 0);
    buf[0] = CMD_REPORT_ID;
    Buffer.from(ascii, "ascii").copy(buf, 1);
    const written = dev.sendFeatureReport(buf);
    return { ok: true, megatec: ascii, reportId: CMD_REPORT_ID, written, hex: buf.toString("hex") };
  } finally {
    try {
      dev.close();
    } catch {
      /* ignore */
    }
  }
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
    void watchPowerEvents(snap);
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

loadTelegramConfigFromDisk();
bindSnapshotGetter(() => latest);
startTelegramPolling();

openDevice();
poll();
setInterval(poll, POLL_MS);

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.url === "/health") {
      sendJson(res, 200, { ok: true, connected: latest.connected, source: "hid", control: "megatec" });
      return;
    }
    if ((req.url === "/snapshot" || req.url === "/") && req.method === "GET") {
      sendJson(res, 200, latest);
      return;
    }
    if (req.url === "/command" && req.method === "POST") {
      const body = await readBody(req);
      // Defense in depth: client must opt in (settings.allowControl) AND
      // server env ALLOW_HID_CONTROL=1 must be set. Default is monitoring-only.
      if (process.env.ALLOW_HID_CONTROL !== "1") {
        sendJson(res, 403, {
          ok: false,
          message:
            "Control writes disabled on bridge — set ALLOW_HID_CONTROL=1 to unlock (monitoring-only by default)",
        });
        return;
      }
      if (body.allowControl !== true) {
        sendJson(res, 403, {
          ok: false,
          message: "Control blocked — enable Allow control in Settings",
        });
        return;
      }
      const command = String(body.command || "");
      const minutes = body.minutes != null ? Number(body.minutes) : undefined;
      const ascii = megatecForCommand(command, minutes);
      if (!ascii) {
        sendJson(res, 400, { ok: false, message: `Unknown command: ${command}` });
        return;
      }
      if (!latest.connected && !findDevice()) {
        sendJson(res, 503, { ok: false, message: "UPS not connected" });
        return;
      }
      try {
        device?.close();
      } catch {
        /* ignore */
      }
      device = null;
      const result = sendMegatec(ascii);
      openDevice();
      poll();
      sendJson(res, 200, {
        ok: true,
        message: `Megatec '${ascii}' sent to UPS`,
        command,
        ...result,
        at: Date.now(),
      });
      return;
    }
    if (req.url === "/mail/test" && req.method === "POST") {
      const body = await readBody(req);
      let nodemailer;
      try {
        nodemailer = await import("nodemailer");
      } catch {
        sendJson(res, 501, {
          ok: false,
          message: "nodemailer not installed — run npm install nodemailer",
        });
        return;
      }
      const transporter = nodemailer.createTransport({
        host: body.host,
        port: Number(body.port) || 25,
        secure: Boolean(body.secure),
        auth:
          body.username && body.password
            ? { user: body.username, pass: body.password }
            : undefined,
      });
      const info = await transporter.sendMail({
        from: body.from,
        to: body.to,
        subject: body.subject || "KPower test message",
        text: body.text || "KPower SMTP test — mail path is working.",
      });
      sendJson(res, 200, {
        ok: true,
        message: `Accepted by SMTP server (messageId ${info.messageId || "n/a"})`,
      });
      return;
    }

    if (req.url === "/telegram/config" && req.method === "POST") {
      const body = await readBody(req);
      const next = saveTelegramConfig({
        enabled: body.enabled != null ? Boolean(body.enabled) : undefined,
        botToken: body.botToken != null ? String(body.botToken) : undefined,
        chatId: body.chatId != null ? String(body.chatId) : undefined,
        outageMinutes:
          body.outageMinutes != null ? Number(body.outageMinutes) : undefined,
        notifyFail: body.notifyFail != null ? Boolean(body.notifyFail) : undefined,
        notifyRestore:
          body.notifyRestore != null ? Boolean(body.notifyRestore) : undefined,
        notifyExtended:
          body.notifyExtended != null ? Boolean(body.notifyExtended) : undefined,
      });
      sendJson(res, 200, {
        ok: true,
        message: next.enabled
          ? "Telegram bot enabled — send /help to your bot"
          : "Telegram bot disabled",
        config: getTelegramConfig(),
      });
      return;
    }

    if (req.url === "/telegram/config" && req.method === "GET") {
      sendJson(res, 200, { ok: true, config: getTelegramConfig() });
      return;
    }

    if (req.url === "/notify/telegram" && req.method === "POST") {
      const body = await readBody(req);
      const token = String(body.botToken || "");
      const chatId = String(body.chatId || "");
      const text = String(body.text || "");
      if (!token || !chatId || !text) {
        sendJson(res, 400, { ok: false, message: "botToken, chatId, text required" });
        return;
      }
      // Persist credentials so the command bot can keep running
      saveTelegramConfig({
        enabled: true,
        botToken: token,
        chatId,
      });
      const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const tgBody = await tg.json().catch(() => ({}));
      if (!tg.ok || !tgBody.ok) {
        sendJson(res, 502, {
          ok: false,
          message: tgBody.description || `Telegram HTTP ${tg.status}`,
        });
        return;
      }
      sendJson(res, 200, { ok: true, message: "Telegram message delivered; bot listening for /commands" });
      return;
    }

    if (req.url === "/notify/webhook" && req.method === "POST") {
      const body = await readBody(req);
      const url = String(body.url || "");
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        sendJson(res, 400, { ok: false, message: "Valid http(s) webhook URL required" });
        return;
      }
      const wh = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body.payload ?? { source: "kpower" }),
      });
      if (!wh.ok) {
        sendJson(res, 502, { ok: false, message: `Webhook HTTP ${wh.status}` });
        return;
      }
      sendJson(res, 200, { ok: true, message: `Webhook accepted (HTTP ${wh.status})` });
      return;
    }

    if (req.url === "/history/import-stock" && req.method === "POST") {
      const { spawnSync } = await import("node:child_process");
      const { fileURLToPath } = await import("node:url");
      const path = await import("node:path");
      const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "inspect-kpower-db.py");
      const out = spawnSync("python", [script], { encoding: "utf8", timeout: 15000 });
      if (out.status !== 0) {
        sendJson(res, 500, {
          ok: false,
          message: out.stderr || out.error?.message || "python import failed",
        });
        return;
      }
      try {
        const parsed = JSON.parse(out.stdout);
        sendJson(res, 200, parsed);
      } catch {
        sendJson(res, 500, { ok: false, message: "Invalid import JSON from python" });
      }
      return;
    }

    if (req.url === "/protocol/snmp" && req.method === "POST") {
      const body = await readBody(req);
      try {
        const snap = await pollSnmp(body);
        sendJson(res, 200, { ok: true, snapshot: snap });
      } catch (e) {
        sendJson(res, 502, { ok: false, message: e.message || String(e) });
      }
      return;
    }

    if (req.url === "/protocol/nut" && req.method === "POST") {
      const body = await readBody(req);
      try {
        const snap = await pollNut(body);
        sendJson(res, 200, { ok: true, snapshot: snap });
      } catch (e) {
        sendJson(res, 502, { ok: false, message: e.message || String(e) });
      }
      return;
    }

    res.writeHead(404);
    res.end("not found");
  } catch (err) {
    sendJson(res, 500, { ok: false, message: err.message || String(err) });
  }
});

/** Minimal UPS-MIB-ish SNMPv2c GET (RFC 1628 common OIDs). */
async function pollSnmp(body) {
  const snmp = await import("net-snmp");
  const host = String(body.host || "");
  const community = String(body.community || "public");
  if (!host) throw new Error("SNMP host required");
  const session = snmp.createSession(host, community, { timeout: 3000, retries: 1 });
  const oids = [
    "1.3.6.1.2.1.33.1.4.4.1.5.1", // output percent load
    "1.3.6.1.2.1.33.1.2.4.0", // battery charge
    "1.3.6.1.2.1.33.1.3.3.1.3.1", // input voltage
    "1.3.6.1.2.1.33.1.4.4.1.2.1", // output voltage
    "1.3.6.1.2.1.33.1.2.3.0", // minutes remaining
    "1.3.6.1.2.1.33.1.2.7.0", // temperature
  ];
  const values = await new Promise((resolve, reject) => {
    session.get(oids, (err, varbinds) => {
      session.close();
      if (err) return reject(err);
      resolve(varbinds.map((v) => (snmp.isVarbindError(v) ? null : Number(v.value))));
    });
  });
  const [load, batt, vin, vout, runtimeMin, temp] = values;
  return {
    connected: true,
    mode: vin != null && vin < 50 ? "battery" : "line",
    loadPercent: load ?? 0,
    batteryPercent: batt ?? 0,
    runtimeSeconds: (runtimeMin ?? 0) * 60,
    inputVoltage: vin ?? 0,
    outputVoltage: vout ?? 0,
    frequency: 0,
    batterySingleVoltage: 0,
    temperatureC: temp ?? 0,
    alarmCodes: [],
    timestampMs: Date.now(),
    source: "snmp",
  };
}

/** NUT (Network UPS Tools) LIST VAR over TCP :3493 */
async function pollNut(body) {
  const net = await import("node:net");
  const host = String(body.host || "127.0.0.1");
  const port = Number(body.port) || 3493;
  const ups = String(body.upsName || "ups");
  const vars = await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.write(`LIST VAR ${ups}\n`);
    });
    let buf = "";
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("NUT timeout"));
    }, 4000);
    socket.on("data", (d) => {
      buf += d.toString("utf8");
      if (buf.includes("END LIST VAR")) {
        clearTimeout(timer);
        socket.end();
        const map = {};
        for (const line of buf.split(/\r?\n/)) {
          const m = line.match(/^VAR\s+\S+\s+(\S+)\s+"(.*)"\s*$/);
          if (m) map[m[1]] = m[2];
        }
        resolve(map);
      }
    });
    socket.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
  const num = (k, fallback = 0) => {
    const v = parseFloat(vars[k]);
    return Number.isFinite(v) ? v : fallback;
  };
  const status = String(vars["ups.status"] || "");
  const onBatt = /\bOB\b/.test(status);
  return {
    connected: true,
    mode: onBatt ? "battery" : status.includes("OL") ? "line" : "unknown",
    loadPercent: num("ups.load"),
    batteryPercent: num("battery.charge"),
    runtimeSeconds: num("battery.runtime"),
    inputVoltage: num("input.voltage"),
    outputVoltage: num("output.voltage"),
    frequency: num("input.frequency"),
    batterySingleVoltage: num("battery.voltage"),
    temperatureC: num("ups.temperature"),
    alarmCodes: onBatt ? ["ON_BATTERY"] : [],
    timestampMs: Date.now(),
    source: "nut",
  };
}

server.listen(PORT, HOST, () => {
  console.log(`[ups-hid-bridge] telemetry  http://${HOST}:${PORT}/snapshot`);
  console.log(`[ups-hid-bridge] control    POST http://${HOST}:${PORT}/command`);
  console.log(`[ups-hid-bridge] notify     POST /mail/test /notify/telegram /notify/webhook`);
  console.log(`[ups-hid-bridge] telegram   GET|POST /telegram/config  (bot commands + power events)`);
  console.log(`[ups-hid-bridge] protocols  POST /protocol/snmp /protocol/nut`);
  console.log(`[ups-hid-bridge] device: ${latest.connected ? "online" : latest.error}`);
});
