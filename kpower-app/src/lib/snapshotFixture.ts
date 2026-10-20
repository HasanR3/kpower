import type { UpsSnapshot } from "./types";

/** Stock-calibrated connected snapshot for tests and demos. */
export const STOCK_LINE_SNAPSHOT: UpsSnapshot = {
  connected: true,
  mode: "line",
  loadPercent: 10,
  batteryPercent: 96,
  runtimeSeconds: 12660,
  inputVoltage: 218.3,
  outputVoltage: 219.7,
  frequency: 50,
  batterySingleVoltage: 2.26,
  temperatureC: 23,
  alarmCodes: [],
  timestampMs: 1,
};

export function snapshotFixture(overrides: Partial<UpsSnapshot> = {}): UpsSnapshot {
  return { ...STOCK_LINE_SNAPSHOT, ...overrides };
}
