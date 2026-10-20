import type { UpsSnapshot } from "./types";
import { loadSettings } from "./appData";

/** Communication / freshness — separate from UPS operating mode. */
export type CommsState = "live" | "stale" | "disconnected" | "bridge_down";

export interface MonitoringStatus {
  comms: CommsState;
  /** UPS operating mode when linked; unknown when not. */
  upsMode: UpsSnapshot["mode"] | "offline";
  lastUpdateMs: number | null;
  ageMs: number | null;
  message: string;
}

/** Multi-device-ready registry entry (single HID device for now). */
export interface MonitoredDevice {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  location: string;
  protocol: "hid" | "snmp" | "nut";
  connection: string;
}

export const DEFAULT_DEVICE: MonitoredDevice = {
  id: "local-hid-mge",
  name: "Local UPS",
  manufacturer: "MGE / Eaton",
  model: "USB HID (VID 0463 / PID 0001)",
  location: "This host",
  protocol: "hid",
  connection: "USB HID · exclusive (close stock KPower)",
};

export function loadDevices(): MonitoredDevice[] {
  try {
    const raw = localStorage.getItem("kpower.devices.v1");
    if (!raw) return [DEFAULT_DEVICE];
    const parsed = JSON.parse(raw) as MonitoredDevice[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_DEVICE];
  } catch {
    return [DEFAULT_DEVICE];
  }
}

export function saveDevices(devices: MonitoredDevice[]) {
  localStorage.setItem("kpower.devices.v1", JSON.stringify(devices));
}

/**
 * Derive monitoring status from snapshot + last successful poll clock.
 * Does not infer hardware faults from missing data alone.
 */
export function deriveMonitoringStatus(
  snapshot: UpsSnapshot | null,
  lastSuccessfulPollAt: number | null,
  bridgeError: string | null,
  now = Date.now(),
): MonitoringStatus {
  const pollMs = Math.max(500, loadSettings().pollIntervalMs || 1000);
  const staleAfter = pollMs * 2.5;

  if (!snapshot) {
    return {
      comms: bridgeError ? "bridge_down" : "disconnected",
      upsMode: "offline",
      lastUpdateMs: lastSuccessfulPollAt,
      ageMs: lastSuccessfulPollAt != null ? now - lastSuccessfulPollAt : null,
      message: bridgeError ?? "No telemetry yet",
    };
  }

  if (!snapshot.connected) {
    return {
      comms: bridgeError?.includes("unreachable") ? "bridge_down" : "disconnected",
      upsMode: "offline",
      lastUpdateMs: snapshot.timestampMs,
      ageMs: now - snapshot.timestampMs,
      message: bridgeError ?? "UPS not connected — close stock KPower and check USB",
    };
  }

  const anchor = lastSuccessfulPollAt ?? snapshot.timestampMs;
  const ageMs = now - anchor;
  if (ageMs > staleAfter) {
    return {
      comms: "stale",
      upsMode: snapshot.mode,
      lastUpdateMs: anchor,
      ageMs,
      message: `Stale reading (${Math.round(ageMs / 1000)}s ago)`,
    };
  }

  return {
    comms: "live",
    upsMode: snapshot.mode,
    lastUpdateMs: anchor,
    ageMs,
    message: "Live HID",
  };
}

/** Format a measurement only when data is usable; otherwise em dash. */
export function liveValue(
  status: MonitoringStatus,
  connected: boolean,
  format: () => string,
): string {
  if (!connected || status.comms === "bridge_down" || status.comms === "disconnected") {
    return "—";
  }
  return format();
}

export function formatLastUpdate(ms: number | null): string {
  if (ms == null) return "Never";
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
