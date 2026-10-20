export type UpsMode = "line" | "battery" | "bypass" | "fault" | "unknown";

export interface UpsSnapshot {
  connected: boolean;
  mode: UpsMode;
  loadPercent: number;
  batteryPercent: number;
  runtimeSeconds: number;
  inputVoltage: number;
  outputVoltage: number;
  frequency: number;
  temperatureC: number;
  alarmCodes: string[];
  timestampMs: number;
}

export const UPS_SNAPSHOT_EVENT = "ups://snapshot";
