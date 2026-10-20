import {
  appendHistorySample,
  loadHistory,
  loadSettings,
  saveHistory,
  type AppSettings,
} from "./appData";
import type { UpsMode, UpsSnapshot } from "./types";
import { UPS_SNAPSHOT_EVENT } from "./types";

const MODES: UpsMode[] = ["line", "battery", "bypass", "fault", "unknown"];

/** Local HID bridge — real MGE USB UPS via node-hid (no simulator). */
export const HID_BRIDGE_URL =
  (import.meta.env.VITE_HID_BRIDGE_URL as string | undefined) ??
  "http://127.0.0.1:3921/snapshot";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Returns null on invalid shape so callers keep last good state. */
export function parseSnapshot(raw: unknown): UpsSnapshot | null {
  if (!isRecord(raw)) return null;
  const mode = raw.mode;
  if (typeof mode !== "string" || !MODES.includes(mode as UpsMode)) return null;
  if (typeof raw.connected !== "boolean") return null;
  const nums = [
    "loadPercent",
    "batteryPercent",
    "runtimeSeconds",
    "inputVoltage",
    "outputVoltage",
    "frequency",
    "batterySingleVoltage",
    "temperatureC",
    "timestampMs",
  ] as const;
  for (const key of nums) {
    if (typeof raw[key] !== "number" || Number.isNaN(raw[key] as number)) return null;
  }
  if (!Array.isArray(raw.alarmCodes) || !raw.alarmCodes.every((c) => typeof c === "string")) {
    return null;
  }
  return {
    connected: raw.connected,
    mode: mode as UpsMode,
    loadPercent: raw.loadPercent as number,
    batteryPercent: raw.batteryPercent as number,
    runtimeSeconds: raw.runtimeSeconds as number,
    inputVoltage: raw.inputVoltage as number,
    outputVoltage: raw.outputVoltage as number,
    frequency: raw.frequency as number,
    batterySingleVoltage: raw.batterySingleVoltage as number,
    temperatureC: raw.temperatureC as number,
    alarmCodes: raw.alarmCodes as string[],
    timestampMs: raw.timestampMs as number,
  };
}

export type UpsListener = (snapshot: UpsSnapshot | null) => void;

let latest: UpsSnapshot | null = null;
const listeners = new Set<UpsListener>();
let started = false;
let unlisten: (() => void) | null = null;
let bridgeTimer: ReturnType<typeof setInterval> | null = null;
let pollIntervalMs = loadSettings().pollIntervalMs || 1000;
let historyWriteCounter = 0;
let lastError: string | null = null;
/** Wall-clock of last successfully parsed poll (connected or honest offline). */
let lastSuccessfulPollAt: number | null = null;

function emit(next: UpsSnapshot | null) {
  latest = next;
  if (next) {
    lastSuccessfulPollAt = Date.now();
  }
  if (next?.connected) {
    historyWriteCounter += 1;
    if (historyWriteCounter % 5 === 0) {
      const hist = appendHistorySample(loadHistory(), next);
      saveHistory(hist);
    }
  }
  listeners.forEach((cb) => cb(latest));
}

function applyRaw(raw: unknown) {
  const parsed = parseSnapshot(raw);
  if (parsed) {
    lastError = null;
    emit(parsed);
  }
}

function offlineFromBridge(reason: string): UpsSnapshot {
  lastError = reason;
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
  };
}

const BRIDGE_BASE = HID_BRIDGE_URL.replace(/\/snapshot$/, "");

async function tryAlternateProtocol(settings: AppSettings): Promise<UpsSnapshot | null> {
  if (settings.snmpEnabled && settings.snmpHost) {
    try {
      const res = await fetch(`${BRIDGE_BASE}/protocol/snmp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: settings.snmpHost,
          community: settings.snmpCommunity || "public",
        }),
      });
      const body = (await res.json()) as { ok?: boolean; snapshot?: unknown; message?: string };
      if (body.ok && body.snapshot) {
        const parsed = parseSnapshot(body.snapshot);
        if (parsed?.connected) return parsed;
      }
    } catch {
      /* fall through */
    }
  }
  if (settings.nutEnabled && settings.nutHost) {
    try {
      const res = await fetch(`${BRIDGE_BASE}/protocol/nut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: settings.nutHost,
          upsName: settings.nutUpsName || "ups",
        }),
      });
      const body = (await res.json()) as { ok?: boolean; snapshot?: unknown };
      if (body.ok && body.snapshot) {
        const parsed = parseSnapshot(body.snapshot);
        if (parsed?.connected) return parsed;
      }
    } catch {
      /* fall through */
    }
  }
  return null;
}

async function pollHidBridge() {
  const settings = loadSettings();
  try {
    const res = await fetch(HID_BRIDGE_URL, { cache: "no-store" });
    if (!res.ok) {
      const alt = await tryAlternateProtocol(settings);
      if (alt) {
        lastError = null;
        emit(alt);
        return;
      }
      emit(offlineFromBridge(`HID bridge HTTP ${res.status}`));
      return;
    }
    const raw = await res.json();
    const parsed = parseSnapshot(raw);
    if (!parsed) {
      emit(offlineFromBridge("HID bridge returned invalid snapshot"));
      return;
    }
    if (!parsed.connected) {
      if (isRecord(raw) && typeof raw.error === "string") {
        lastError = raw.error;
      }
      const alt = await tryAlternateProtocol(settings);
      if (alt) {
        lastError = null;
        emit(alt);
        return;
      }
    } else {
      lastError = null;
    }
    emit(parsed);
  } catch {
    const alt = await tryAlternateProtocol(settings);
    if (alt) {
      lastError = null;
      emit(alt);
      return;
    }
    emit(
      offlineFromBridge(
        "HID bridge unreachable — run `npm run hid` (real USB UPS reader)",
      ),
    );
  }
}

/** Manual SNMP/NUT probe from Settings. */
export async function probeAlternateProtocols(settings: AppSettings): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!settings.snmpEnabled && !settings.nutEnabled) {
    return { ok: false, message: "Enable SNMP or NUT in Settings first" };
  }
  const snap = await tryAlternateProtocol(settings);
  if (!snap) {
    return {
      ok: false,
      message: "SNMP/NUT probe failed — check host credentials and that the bridge is running",
    };
  }
  lastError = null;
  emit(snap);
  return {
    ok: true,
    message: `Probe OK via alternate protocol (${snap.mode}, load ${snap.loadPercent}%)`,
  };
}

function restartBridgePoller() {
  if (bridgeTimer) {
    clearInterval(bridgeTimer);
    bridgeTimer = null;
  }
  void pollHidBridge();
  bridgeTimer = setInterval(() => void pollHidBridge(), pollIntervalMs);
}

async function bindTauriEvents(): Promise<boolean> {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const { invoke } = await import("@tauri-apps/api/core");
    const initial = await invoke<unknown>("get_latest_snapshot");
    applyRaw(initial);
    unlisten = await listen(UPS_SNAPSHOT_EVENT, (event) => {
      applyRaw(event.payload);
    });
    // Only accept Tauri if it actually produced a connected real snapshot.
    // Otherwise fall through to the HID bridge (never a simulator).
    if (latest?.connected) return true;
    unlisten?.();
    unlisten = null;
    return false;
  } catch {
    return false;
  }
}

export function applySettingsRuntime(settings: AppSettings) {
  pollIntervalMs = Math.max(500, settings.pollIntervalMs || 1000);
  if (bridgeTimer) restartBridgePoller();
}

export function getLatestSnapshot(): UpsSnapshot | null {
  return latest;
}

export function getUpsLinkError(): string | null {
  return lastError;
}

export function getLastSuccessfulPollAt(): number | null {
  return lastSuccessfulPollAt;
}

export function subscribeUps(cb: UpsListener): () => void {
  listeners.add(cb);
  cb(latest);
  if (!started) {
    started = true;
    const settings = loadSettings();
    pollIntervalMs = Math.max(500, settings.pollIntervalMs || 1000);
    void bindTauriEvents().then((ok) => {
      if (!ok) restartBridgePoller();
    });
  }
  return () => {
    listeners.delete(cb);
  };
}

export function __resetUpsStoreForTests() {
  latest = null;
  listeners.clear();
  started = false;
  unlisten?.();
  unlisten = null;
  if (bridgeTimer) clearInterval(bridgeTimer);
  bridgeTimer = null;
  historyWriteCounter = 0;
  pollIntervalMs = 1000;
  lastError = null;
  lastSuccessfulPollAt = null;
}

export { UPS_SNAPSHOT_EVENT };
