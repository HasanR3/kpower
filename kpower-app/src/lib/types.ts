export type UpsMode = "line" | "battery" | "bypass" | "fault" | "unknown";

/**
 * Live UPS telemetry — field set mirrors stock KPower Device → Data tab.
 * Sourced from the MGE USB HID UPS (VID 0463 / PID 0001) via the HID bridge.
 */
export interface UpsSnapshot {
  connected: boolean;
  mode: UpsMode;
  /** Stock: UPS Load (%) */
  loadPercent: number;
  /** Capacity estimate used by dials / policy (not on stock Data tab) */
  batteryPercent: number;
  /** Stock banner: Battery Remaining Time */
  runtimeSeconds: number;
  /** Stock: Input Voltage (V) */
  inputVoltage: number;
  /** Stock: Output Voltage (V) */
  outputVoltage: number;
  /** Stock: Input Frequency (Hz) */
  frequency: number;
  /** Stock: Battery Single Voltage (V per cell) */
  batterySingleVoltage: number;
  /** Stock: Temperature (°C) */
  temperatureC: number;
  alarmCodes: string[];
  timestampMs: number;
}

export const UPS_SNAPSHOT_EVENT = "ups://snapshot";
