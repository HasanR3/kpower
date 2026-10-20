import type { AlarmRecord, AlarmSeverity, AppSettings } from "./appData";
import type { UpsSnapshot } from "./types";
import { deriveMonitoringStatus } from "./monitoring";

const LIVE_META: Record<string, { message: string; severity: AlarmSeverity }> = {
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

function upsert(
  list: AlarmRecord[],
  code: string,
  message: string,
  severity: AlarmSeverity,
  now: number,
): AlarmRecord[] {
  const open = list.find((a) => a.active && a.code === code);
  if (open) return list;
  return [
    {
      id: `thr-${code}`,
      code,
      message,
      severity,
      active: true,
      acked: false,
      createdAt: now,
    },
    ...list.filter((a) => !(a.id === `thr-${code}` && !a.active)),
  ];
}

function clearCode(list: AlarmRecord[], code: string, prefix: string, now: number): AlarmRecord[] {
  return list.map((a) => {
    if (!a.active) return a;
    if (a.code !== code) return a;
    if (!a.id.startsWith(prefix) && !a.id.startsWith("live-") && !a.id.startsWith("thr-")) {
      return a;
    }
    if (a.id.startsWith("live-") && prefix === "thr-") return a;
    if (a.id.startsWith("thr-") && prefix === "live-") return a;
    return { ...a, active: false, clearedAt: now };
  });
}

/**
 * Merge device-reported codes + configurable thresholds.
 * COMMS_DOWN / DATA_STALE are data-quality, not UPS hardware faults.
 */
export function evaluateAlarms(
  existing: AlarmRecord[],
  snapshot: UpsSnapshot | null,
  settings: AppSettings,
  lastSuccessfulPollAt: number | null,
  bridgeError: string | null,
  now = Date.now(),
): AlarmRecord[] {
  const status = deriveMonitoringStatus(snapshot, lastSuccessfulPollAt, bridgeError, now);
  let next = [...existing];

  // --- Device-reported codes ---
  const codes = new Set(snapshot?.connected ? snapshot.alarmCodes : []);
  next = next.map((a) => {
    if (!a.active || !a.id.startsWith("live-")) return a;
    if (codes.has(a.code)) return a;
    return { ...a, active: false, clearedAt: now };
  });
  for (const code of codes) {
    const meta = LIVE_META[code] ?? {
      message: `UPS reported condition ${code}`,
      severity: "warning" as AlarmSeverity,
    };
    const open = next.find((a) => a.active && a.code === code && a.id.startsWith("live-"));
    if (!open) {
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
  }

  // --- Comms / freshness (not hardware critical by missing data alone) ---
  if (status.comms === "bridge_down" || status.comms === "disconnected") {
    next = upsert(
      next,
      "COMMS_DOWN",
      status.message,
      "warning",
      now,
    );
  } else {
    next = clearCode(next, "COMMS_DOWN", "thr-", now);
  }

  if (status.comms === "stale") {
    next = upsert(next, "DATA_STALE", status.message, "info", now);
  } else {
    next = clearCode(next, "DATA_STALE", "thr-", now);
  }

  if (!snapshot?.connected) {
    return next;
  }

  const s = snapshot;
  const loadWarn = settings.alarmLoadWarnPercent;
  const loadCrit = settings.alarmLoadCritPercent;
  const batWarn = settings.alarmBatteryWarnPercent;
  const batCrit = settings.alarmBatteryCritPercent;
  const runtimeWarn = settings.alarmRuntimeWarnSeconds;
  const vNom = settings.alarmVoltageNominal;
  const vTol = settings.alarmVoltageTolPercent / 100;
  const tempWarn = settings.alarmTempWarnC;

  if (s.loadPercent >= loadCrit) {
    next = upsert(next, "LOAD_CRIT", `Output load ${s.loadPercent.toFixed(0)}% ≥ ${loadCrit}%`, "critical", now);
    next = clearCode(next, "LOAD_WARN", "thr-", now);
  } else if (s.loadPercent >= loadWarn) {
    next = upsert(next, "LOAD_WARN", `Output load ${s.loadPercent.toFixed(0)}% ≥ ${loadWarn}%`, "warning", now);
    next = clearCode(next, "LOAD_CRIT", "thr-", now);
  } else {
    next = clearCode(next, "LOAD_WARN", "thr-", now);
    next = clearCode(next, "LOAD_CRIT", "thr-", now);
  }

  if (s.batteryPercent <= batCrit) {
    next = upsert(next, "BATT_CRIT", `Battery ${s.batteryPercent.toFixed(0)}% ≤ ${batCrit}%`, "critical", now);
    next = clearCode(next, "BATT_WARN", "thr-", now);
  } else if (s.batteryPercent <= batWarn) {
    next = upsert(next, "BATT_WARN", `Battery ${s.batteryPercent.toFixed(0)}% ≤ ${batWarn}%`, "warning", now);
    next = clearCode(next, "BATT_CRIT", "thr-", now);
  } else {
    next = clearCode(next, "BATT_WARN", "thr-", now);
    next = clearCode(next, "BATT_CRIT", "thr-", now);
  }

  if (s.runtimeSeconds <= runtimeWarn && s.mode === "battery") {
    next = upsert(
      next,
      "RUNTIME_LOW",
      `Estimated runtime ${Math.round(s.runtimeSeconds / 60)} min below threshold`,
      "warning",
      now,
    );
  } else {
    next = clearCode(next, "RUNTIME_LOW", "thr-", now);
  }

  const lo = vNom * (1 - vTol);
  const hi = vNom * (1 + vTol);
  if (s.inputVoltage > 50 && (s.inputVoltage < lo || s.inputVoltage > hi)) {
    next = upsert(
      next,
      "VOLTAGE_OUT",
      `Input ${s.inputVoltage.toFixed(1)} V outside ${lo.toFixed(0)}–${hi.toFixed(0)} V`,
      "warning",
      now,
    );
  } else {
    next = clearCode(next, "VOLTAGE_OUT", "thr-", now);
  }

  if (s.temperatureC >= tempWarn) {
    next = upsert(
      next,
      "TEMP_HIGH",
      `Temperature ${s.temperatureC.toFixed(1)} °C ≥ ${tempWarn} °C`,
      "warning",
      now,
    );
  } else {
    next = clearCode(next, "TEMP_HIGH", "thr-", now);
  }

  return next;
}
