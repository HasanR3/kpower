/**
 * Telegram bot for KPower HID bridge:
 * - Commands: /status /voltage /load /battery /freq /runtime /temp /help
 * - Events: power fail, power restore, extended outage
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), "AppData", "Local", "KPowerMonitor");
const CONFIG_PATH = path.join(CONFIG_DIR, "telegram.json");

/** @type {{ enabled: boolean, botToken: string, chatId: string, outageMinutes: number, notifyFail: boolean, notifyRestore: boolean, notifyExtended: boolean }} */
let config = {
  enabled: false,
  botToken: "",
  chatId: "",
  outageMinutes: 5,
  notifyFail: true,
  notifyRestore: true,
  notifyExtended: true,
};

let offset = 0;
let polling = false;
let lastMode = null;
let batterySinceMs = null;
let extendedNotified = false;

/** @type {() => object} */
let getSnapshot = () => ({ connected: false });

export function loadTelegramConfigFromDisk() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return config;
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    config = { ...config, ...raw };
  } catch {
    /* keep defaults */
  }
  return config;
}

export function saveTelegramConfig(partial) {
  const clean = {};
  for (const [k, v] of Object.entries(partial || {})) {
    if (v !== undefined) clean[k] = v;
  }
  config = { ...config, ...clean };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  return config;
}

export function getTelegramConfig() {
  return { ...config, botToken: config.botToken ? "***" : "" };
}

export function bindSnapshotGetter(fn) {
  getSnapshot = fn;
}

async function tgApi(method, body) {
  if (!config.botToken) throw new Error("No bot token");
  const res = await fetch(`https://api.telegram.org/bot${config.botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.description || `Telegram ${method} HTTP ${res.status}`);
  }
  return data.result;
}

export async function sendTelegram(text) {
  if (!config.enabled || !config.botToken || !config.chatId) return false;
  await tgApi("sendMessage", {
    chat_id: config.chatId,
    text,
    disable_web_page_preview: true,
  });
  return true;
}

function fmtRuntime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${r}s`;
}

function formatStatus(snap) {
  if (!snap?.connected) {
    return "UPS offline / not connected.\nClose stock KPower and check USB.";
  }
  const mode =
    snap.mode === "battery" ? "ON BATTERY (utility out)" : snap.mode === "line" ? "ON MAINS" : String(snap.mode);
  return [
    "KPower UPS status",
    `Mode: ${mode}`,
    `Input: ${Number(snap.inputVoltage).toFixed(1)} V`,
    `Output: ${Number(snap.outputVoltage).toFixed(1)} V`,
    `Frequency: ${Number(snap.frequency).toFixed(1)} Hz`,
    `Load: ${Number(snap.loadPercent).toFixed(0)} %`,
    `Battery: ${Number(snap.batteryPercent).toFixed(0)} %`,
    `Cell V: ${Number(snap.batterySingleVoltage).toFixed(2)} V`,
    `Runtime: ${fmtRuntime(snap.runtimeSeconds)}`,
    `Temp: ${Number(snap.temperatureC).toFixed(1)} °C`,
  ].join("\n");
}

function handleCommand(text) {
  const snap = getSnapshot();
  const cmd = String(text || "")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/@\w+$/, "");

  switch (cmd) {
    case "/start":
    case "/help":
      return [
        "KPower UPS bot",
        "",
        "Commands:",
        "/status — full snapshot",
        "/voltage — input & output V",
        "/load — UPS load %",
        "/battery — capacity & cell V",
        "/freq — line frequency",
        "/runtime — estimated runtime",
        "/temp — temperature",
        "/help — this list",
        "",
        "Auto alerts: power off, power on, outage > N minutes",
      ].join("\n");
    case "/status":
    case "/ups":
      return formatStatus(snap);
    case "/voltage":
    case "/volt":
    case "/vin":
      if (!snap?.connected) return "UPS offline.";
      return `Input ${Number(snap.inputVoltage).toFixed(1)} V\nOutput ${Number(snap.outputVoltage).toFixed(1)} V`;
    case "/vout":
      if (!snap?.connected) return "UPS offline.";
      return `Output ${Number(snap.outputVoltage).toFixed(1)} V`;
    case "/load":
      if (!snap?.connected) return "UPS offline.";
      return `Load ${Number(snap.loadPercent).toFixed(0)} %`;
    case "/battery":
    case "/capacity":
    case "/batt":
      if (!snap?.connected) return "UPS offline.";
      return `Capacity ${Number(snap.batteryPercent).toFixed(0)} %\nCell ${Number(snap.batterySingleVoltage).toFixed(2)} V\nRuntime ${fmtRuntime(snap.runtimeSeconds)}`;
    case "/freq":
    case "/frequency":
    case "/hz":
      if (!snap?.connected) return "UPS offline.";
      return `Frequency ${Number(snap.frequency).toFixed(1)} Hz`;
    case "/runtime":
      if (!snap?.connected) return "UPS offline.";
      return `Estimated runtime ${fmtRuntime(snap.runtimeSeconds)}`;
    case "/temp":
    case "/temperature":
      if (!snap?.connected) return "UPS offline.";
      return `Temperature ${Number(snap.temperatureC).toFixed(1)} °C`;
    default:
      return null;
  }
}

async function pollUpdatesOnce() {
  if (!config.enabled || !config.botToken) return;
  const updates = await tgApi("getUpdates", {
    offset,
    timeout: 25,
    allowed_updates: ["message"],
  });
  for (const u of updates || []) {
    offset = u.update_id + 1;
    const msg = u.message;
    if (!msg?.text) continue;
    const chatId = String(msg.chat?.id ?? "");
    if (config.chatId && chatId !== String(config.chatId)) {
      // ignore other chats
      continue;
    }
    // If chatId not configured yet, adopt first commander
    if (!config.chatId && chatId) {
      saveTelegramConfig({ chatId });
    }
    const reply = handleCommand(msg.text);
    if (reply) {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: reply,
        reply_to_message_id: msg.message_id,
      });
    }
  }
}

export function startTelegramPolling() {
  if (polling) return;
  polling = true;
  const loop = async () => {
    while (polling) {
      try {
        if (config.enabled && config.botToken) {
          await pollUpdatesOnce();
        } else {
          await new Promise((r) => setTimeout(r, 3000));
        }
      } catch (err) {
        console.error("[telegram-bot]", err.message || err);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };
  void loop();
  console.log("[telegram-bot] polling loop started");
}

export function stopTelegramPolling() {
  polling = false;
}

/**
 * Call after each UPS snapshot update.
 */
export async function watchPowerEvents(snap) {
  if (!config.enabled || !config.botToken || !config.chatId) return;
  if (!snap?.connected) return;

  const mode = snap.mode === "battery" ? "battery" : snap.mode === "line" ? "line" : null;
  if (!mode) return;

  const now = Date.now();

  if (lastMode === null) {
    lastMode = mode;
    if (mode === "battery") {
      batterySinceMs = now;
      extendedNotified = false;
    }
    return;
  }

  if (mode === "battery" && lastMode === "line") {
    batterySinceMs = now;
    extendedNotified = false;
    if (config.notifyFail) {
      try {
        await sendTelegram(
          [
            "⚡ POWER FAILURE",
            "Utility power lost — UPS on battery.",
            `Load ${Number(snap.loadPercent).toFixed(0)}% · Battery ${Number(snap.batteryPercent).toFixed(0)}%`,
            `Runtime ~ ${fmtRuntime(snap.runtimeSeconds)}`,
            `Time: ${new Date(now).toLocaleString()}`,
          ].join("\n"),
        );
      } catch (e) {
        console.error("[telegram-bot] power-fail notify", e.message);
      }
    }
  }

  if (mode === "line" && lastMode === "battery") {
    const outMs = batterySinceMs ? now - batterySinceMs : 0;
    const outMin = Math.round(outMs / 60000);
    batterySinceMs = null;
    extendedNotified = false;
    if (config.notifyRestore) {
      try {
        await sendTelegram(
          [
            "✅ POWER RESTORED",
            "Utility power is back — UPS on mains.",
            outMs > 0 ? `Outage lasted ~ ${outMin} min` : null,
            `Input ${Number(snap.inputVoltage).toFixed(1)} V · Load ${Number(snap.loadPercent).toFixed(0)}%`,
            `Time: ${new Date(now).toLocaleString()}`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      } catch (e) {
        console.error("[telegram-bot] power-restore notify", e.message);
      }
    }
  }

  if (mode === "battery" && batterySinceMs && !extendedNotified && config.notifyExtended) {
    const thresholdMs = Math.max(1, Number(config.outageMinutes) || 5) * 60_000;
    if (now - batterySinceMs >= thresholdMs) {
      extendedNotified = true;
      try {
        await sendTelegram(
          [
            "⚠️ EXTENDED OUTAGE",
            `Utility still out for ≥ ${config.outageMinutes} minutes.`,
            `Battery ${Number(snap.batteryPercent).toFixed(0)}% · Runtime ~ ${fmtRuntime(snap.runtimeSeconds)}`,
            `Load ${Number(snap.loadPercent).toFixed(0)}%`,
            `Time: ${new Date(now).toLocaleString()}`,
          ].join("\n"),
        );
      } catch (e) {
        console.error("[telegram-bot] extended-outage notify", e.message);
      }
    }
  }

  lastMode = mode;
}
