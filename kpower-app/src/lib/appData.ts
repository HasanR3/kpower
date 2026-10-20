import type { UpsSnapshot } from "./types";

export type AlarmSeverity = "info" | "warning" | "critical";

export interface AlarmRecord {
  id: string;
  code: string;
  message: string;
  severity: AlarmSeverity;
  active: boolean;
  acked: boolean;
  createdAt: number;
  clearedAt?: number;
}

export type ScheduleAction = "selfTest" | "buzzerMute" | "shutdownOs" | "upsOff";

export interface ScheduleItem {
  id: string;
  label: string;
  action: ScheduleAction;
  /** Local datetime-local value */
  runAt: string;
  enabled: boolean;
}

export type ControlCommand =
  | "selfTest"
  | "buzzerOn"
  | "buzzerOff"
  | "upsOn"
  | "upsOff";

export interface CommandResult {
  id: string;
  command: ControlCommand;
  ok: boolean;
  message: string;
  at: number;
}

export interface HistorySample {
  at: number;
  loadPercent: number;
  batteryPercent: number;
  inputVoltage: number;
  outputVoltage: number;
  connected: boolean;
  mode: string;
}

export interface AppSettings {
  pollIntervalMs: number;
  language: "en" | "ar";
  commsType: "usb" | "serial";
  shutdownBatteryPercent: number;
  shutdownRuntimeSeconds: number;
  startWithWindows: boolean;
  minimizeToTray: boolean;
  simulateAlarms: boolean;
}

const SETTINGS_KEY = "kpower.settings.v1";
const SCHEDULES_KEY = "kpower.schedules.v1";
const ALARMS_KEY = "kpower.alarms.v1";
const HISTORY_KEY = "kpower.history.v1";
const EVENTS_KEY = "kpower.events.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  pollIntervalMs: 1000,
  language: "en",
  commsType: "usb",
  shutdownBatteryPercent: 15,
  shutdownRuntimeSeconds: 300,
  startWithWindows: false,
  minimizeToTray: true,
  simulateAlarms: true,
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...loadJson(SETTINGS_KEY, {}) };
}

export function saveSettings(settings: AppSettings) {
  saveJson(SETTINGS_KEY, settings);
}

export function loadSchedules(): ScheduleItem[] {
  return loadJson(SCHEDULES_KEY, []);
}

export function saveSchedules(items: ScheduleItem[]) {
  saveJson(SCHEDULES_KEY, items);
}

export function loadAlarms(): AlarmRecord[] {
  return loadJson(ALARMS_KEY, seedAlarms());
}

export function saveAlarms(items: AlarmRecord[]) {
  saveJson(ALARMS_KEY, items);
}

export function loadHistory(): HistorySample[] {
  return loadJson(HISTORY_KEY, []);
}

export function saveHistory(items: HistorySample[]) {
  saveJson(HISTORY_KEY, items.slice(-2000));
}

export function loadCommandResults(): CommandResult[] {
  return loadJson(EVENTS_KEY, []);
}

export function saveCommandResults(items: CommandResult[]) {
  saveJson(EVENTS_KEY, items.slice(-200));
}

export function seedAlarms(): AlarmRecord[] {
  const now = Date.now();
  return [
    {
      id: "a-demo-1",
      code: "BATTERY_LOW",
      message: "Battery capacity below warning threshold",
      severity: "warning",
      active: false,
      acked: true,
      createdAt: now - 86_400_000,
      clearedAt: now - 85_000_000,
    },
    {
      id: "a-demo-2",
      code: "INPUT_FAIL",
      message: "Utility input failed — running on battery",
      severity: "critical",
      active: false,
      acked: true,
      createdAt: now - 172_800_000,
      clearedAt: now - 172_000_000,
    },
  ];
}

export function appendHistorySample(
  history: HistorySample[],
  snapshot: UpsSnapshot,
): HistorySample[] {
  const sample: HistorySample = {
    at: snapshot.timestampMs,
    loadPercent: snapshot.loadPercent,
    batteryPercent: snapshot.batteryPercent,
    inputVoltage: snapshot.inputVoltage,
    outputVoltage: snapshot.outputVoltage,
    connected: snapshot.connected,
    mode: snapshot.mode,
  };
  const next = [...history, sample];
  return next.length > 2000 ? next.slice(-2000) : next;
}

export function exportHistoryCsv(samples: HistorySample[]): string {
  const header =
    "timestamp,connected,mode,loadPercent,batteryPercent,inputVoltage,outputVoltage";
  const rows = samples.map((s) =>
    [
      new Date(s.at).toISOString(),
      s.connected,
      s.mode,
      s.loadPercent.toFixed(1),
      s.batteryPercent.toFixed(1),
      s.inputVoltage.toFixed(1),
      s.outputVoltage.toFixed(1),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

export function scheduleActionLabel(action: ScheduleAction): string {
  switch (action) {
    case "selfTest":
      return "Self-test";
    case "buzzerMute":
      return "Mute buzzer";
    case "shutdownOs":
      return "Shutdown OS";
    case "upsOff":
      return "UPS power off";
  }
}

export function controlCommandLabel(cmd: ControlCommand): string {
  switch (cmd) {
    case "selfTest":
      return "Self-test";
    case "buzzerOn":
      return "Buzzer on";
    case "buzzerOff":
      return "Buzzer off";
    case "upsOn":
      return "UPS power on";
    case "upsOff":
      return "UPS power off";
  }
}

export function isDestructive(cmd: ControlCommand): boolean {
  return cmd === "upsOff";
}

/** Simulated command path until HID is wired. */
export function runSimulatedCommand(
  cmd: ControlCommand,
  connected: boolean,
): CommandResult {
  const id = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (!connected && cmd !== "upsOn") {
    return {
      id,
      command: cmd,
      ok: false,
      message: `${controlCommandLabel(cmd)} failed: UPS not connected`,
      at: Date.now(),
    };
  }
  return {
    id,
    command: cmd,
    ok: true,
    message: `${controlCommandLabel(cmd)} sent (simulator)`,
    at: Date.now(),
  };
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
