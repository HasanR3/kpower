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
let simTimer: ReturnType<typeof setInterval> | null = null;
let simConnected = true;
let simMode: UpsMode = "line";
let simTick = 0;
let pollIntervalMs = loadSettings().pollIntervalMs || 1000;
let historyWriteCounter = 0;

function emit(next: UpsSnapshot | null) {
  latest = next;
  if (next) {
    historyWriteCounter += 1;
    // Persist ~every 5th sample to avoid thrashing localStorage
    if (historyWriteCounter % 5 === 0) {
      const hist = appendHistorySample(loadHistory(), next);
      saveHistory(hist);
    }
  }
  listeners.forEach((cb) => cb(latest));
}

function applyRaw(raw: unknown) {
  const parsed = parseSnapshot(raw);
  if (parsed) emit(parsed);
}

function sampleSimulator(): UpsSnapshot {
  simTick += 1;
  const wobble = Math.sin(simTick / 8) * 3;
  const onBattery = simConnected && simMode === "battery";
  return {
    connected: simConnected,
    mode: simConnected ? simMode : "unknown",
    loadPercent: simConnected ? 35 + wobble : 0,
    batteryPercent: simConnected ? (onBattery ? Math.max(20, 80 - simTick * 0.05) : 96) : 0,
    runtimeSeconds: simConnected ? (onBattery ? 1800 : 5400) : 0,
    inputVoltage: simConnected ? (onBattery ? 0 : 230 + wobble) : 0,
    outputVoltage: simConnected ? 229 + wobble * 0.5 : 0,
    frequency: simConnected ? 50 : 0,
    temperatureC: simConnected ? 28 + wobble * 0.1 : 0,
    alarmCodes: onBattery ? ["ON_BATTERY"] : [],
    timestampMs: Date.now(),
  };
}

async function bindTauriEvents() {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const { invoke } = await import("@tauri-apps/api/core");
    const initial = await invoke<unknown>("get_latest_snapshot");
    applyRaw(initial);
    unlisten = await listen(UPS_SNAPSHOT_EVENT, (event) => {
      applyRaw(event.payload);
    });
    return true;
  } catch {
    return false;
  }
}

function restartSimulatorTimer() {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  emit(sampleSimulator());
  simTimer = setInterval(() => emit(sampleSimulator()), pollIntervalMs);
}

function startSimulator() {
  if (simTimer) return;
  restartSimulatorTimer();
}

export function applySettingsRuntime(settings: AppSettings) {
  pollIntervalMs = Math.max(500, settings.pollIntervalMs || 1000);
  if (simTimer) restartSimulatorTimer();
}

export function simulatorSetConnected(connected: boolean) {
  simConnected = connected;
  emit(sampleSimulator());
}

export function simulatorSetMode(mode: UpsMode) {
  simMode = mode;
  emit(sampleSimulator());
}

export function getLatestSnapshot(): UpsSnapshot | null {
  return latest;
}

export function subscribeUps(cb: UpsListener): () => void {
  listeners.add(cb);
  cb(latest);
  if (!started) {
    started = true;
    const settings = loadSettings();
    pollIntervalMs = Math.max(500, settings.pollIntervalMs || 1000);
    void bindTauriEvents().then((ok) => {
      if (!ok) startSimulator();
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
  if (simTimer) clearInterval(simTimer);
  simTimer = null;
  simConnected = true;
  simMode = "line";
  simTick = 0;
  historyWriteCounter = 0;
  pollIntervalMs = 1000;
}

export { UPS_SNAPSHOT_EVENT };
