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
  runAt: string;
  enabled: boolean;
}

/** Stock KPower UPS Control commands */
export type ControlCommand =
  | "selfTest10s"
  | "selfTestEod"
  | "selfTestMinutes"
  | "selfTestCancel"
  | "closeOutputMinutes"
  | "closeOutputCancel"
  | "buzzerToggle";

export interface CommandResult {
  id: string;
  command: ControlCommand;
  ok: boolean;
  message: string;
  at: number;
  detail?: string;
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
  startWithWindows: boolean;
  minimizeToTray: boolean;
  simulateAlarms: boolean;

  /** Email notification settings (stock Common Parameters → E-Mail) */
  emailEnabled: boolean;
  emailSmtpHost: string;
  emailSmtpPort: number;
  emailUsername: string;
  emailPassword: string;
  emailFrom: string;
  emailTo: string;
  emailOnAlarm: boolean;
  emailOnPowerFail: boolean;
  emailOnLowBattery: boolean;

  /** Stock Shutdown → KPower power control */
  powerControlEnabled: boolean;
  shutdownMinutesAfterAcFault: number;
  shutdownMinutesOnLowBattery: number;
  shutdownBatteryPercentAfterAcFault: number;
  shutdownOs: boolean;
  commandFileEnabled: boolean;
  commandFilePath: string;
  commandMaxExecutionMinutes: number;

  /** Stock Shutdown → UPS Power Off */
  upsPowerOffEnabled: boolean;
  upsPowerOffDelayMinutes: number;

  /** Legacy aliases used by Overview health score */
  shutdownBatteryPercent: number;
  shutdownRuntimeSeconds: number;
}

const SETTINGS_KEY = "kpower.settings.v2";
const SCHEDULES_KEY = "kpower.schedules.v1";
const ALARMS_KEY = "kpower.alarms.v1";
const HISTORY_KEY = "kpower.history.v1";
const EVENTS_KEY = "kpower.events.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  pollIntervalMs: 1000,
  language: "en",
  commsType: "usb",
  startWithWindows: false,
  minimizeToTray: true,
  simulateAlarms: false,

  emailEnabled: false,
  emailSmtpHost: "",
  emailSmtpPort: 587,
  emailUsername: "",
  emailPassword: "",
  emailFrom: "",
  emailTo: "",
  emailOnAlarm: true,
  emailOnPowerFail: true,
  emailOnLowBattery: true,

  powerControlEnabled: true,
  shutdownMinutesAfterAcFault: 0,
  shutdownMinutesOnLowBattery: 3,
  shutdownBatteryPercentAfterAcFault: 1,
  shutdownOs: true,
  commandFileEnabled: false,
  commandFilePath: "",
  commandMaxExecutionMinutes: 1,

  upsPowerOffEnabled: false,
  upsPowerOffDelayMinutes: 1,

  shutdownBatteryPercent: 15,
  shutdownRuntimeSeconds: 300,
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
  const legacy = loadJson<Partial<AppSettings>>("kpower.settings.v1", {});
  const current = loadJson<Partial<AppSettings>>(SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...legacy, ...current };
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

/** Empty default — live UPS codes are synced via syncAlarmsFromSnapshot. */
export function seedAlarms(): AlarmRecord[] {
  return [];
}

const LIVE_ALARM_META: Record<
  string,
  { message: string; severity: AlarmSeverity }
> = {
  ON_BATTERY: {
    message: "Utility input unavailable — UPS running on battery",
    severity: "critical",
  },
  UPS_FAULT: {
    message: "UPS reported a fault condition",
    severity: "critical",
  },
  OVERLOAD: {
    message: "Output load exceeded rated capacity",
    severity: "critical",
  },
  BATTERY_LOW: {
    message: "Battery capacity below warning threshold",
    severity: "warning",
  },
};

/**
 * Keep AlarmRecord store aligned with live UPS alarm codes from HID telemetry.
 * Does not invent demo alarms.
 */
export function syncAlarmsFromSnapshot(
  existing: AlarmRecord[],
  snapshot: UpsSnapshot | null,
): AlarmRecord[] {
  const codes = new Set(snapshot?.connected ? snapshot.alarmCodes : []);
  const now = Date.now();
  let next = existing.map((a) => {
    if (!a.active) return a;
    if (codes.has(a.code)) return a;
    // Clear live-synced alarms that are no longer present
    if (a.id.startsWith("live-")) {
      return { ...a, active: false, clearedAt: now };
    }
    return a;
  });

  for (const code of codes) {
    const open = next.find((a) => a.active && a.code === code);
    if (open) continue;
    const meta = LIVE_ALARM_META[code] ?? {
      message: `UPS reported condition ${code}`,
      severity: "warning" as AlarmSeverity,
    };
    next = [
      {
        id: `live-${code}`,
        code,
        message: meta.message,
        severity: meta.severity,
        active: true,
        acked: false,
        createdAt: now,
      },
      ...next,
    ];
  }

  return next;
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
      return "Shutdown operating system";
    case "upsOff":
      return "UPS power off";
  }
}

export function controlCommandLabel(cmd: ControlCommand | string): string {
  switch (cmd) {
    case "selfTest10s":
      return "UPS self-test for 10 seconds";
    case "selfTestEod":
      return "UPS self-test to end of discharge";
    case "selfTestMinutes":
      return "UPS self-test for custom duration";
    case "selfTestCancel":
      return "Cancel UPS self-test";
    case "closeOutputMinutes":
      return "Close UPS output after delay";
    case "closeOutputCancel":
      return "Cancel close UPS output";
    case "buzzerToggle":
      return "UPS buzzer toggle";
    default:
      return String(cmd);
  }
}

export function isDestructive(cmd: ControlCommand): boolean {
  return cmd === "closeOutputMinutes" || cmd === "selfTestEod";
}

/**
 * Attempt a UPS control command.
 * HID feature-report writes for stock control opcodes are not mapped yet —
 * never report success unless the device actually accepted the command.
 */
export function runControlCommand(
  cmd: ControlCommand,
  connected: boolean,
  detail?: string,
): CommandResult {
  const id = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const label = controlCommandLabel(cmd);
  if (!connected) {
    return {
      id,
      command: cmd,
      ok: false,
      message: `${label} failed: UPS not connected`,
      at: Date.now(),
      detail,
    };
  }
  return {
    id,
    command: cmd,
    ok: false,
    message: detail
      ? `${label} not sent (${detail}): HID control write path not implemented`
      : `${label} not sent: HID control write path not implemented`,
    at: Date.now(),
    detail,
  };
}

/** @deprecated Use runControlCommand — kept for any stale imports during transition */
export const runSimulatedCommand = runControlCommand;

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
