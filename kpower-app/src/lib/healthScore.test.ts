import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./appData";
import { computeHealth } from "./healthScore";
import type { UpsSnapshot } from "./types";

const base: UpsSnapshot = {
  connected: true,
  mode: "line",
  loadPercent: 30,
  batteryPercent: 95,
  runtimeSeconds: 5400,
  inputVoltage: 230,
  outputVoltage: 229,
  frequency: 50,
  temperatureC: 28,
  alarmCodes: [],
  timestampMs: 1,
};

describe("computeHealth", () => {
  it("scores healthy line mode highly", () => {
    const report = computeHealth(base, [], DEFAULT_SETTINGS);
    expect(report.score).toBeGreaterThanOrEqual(85);
    expect(report.band).toBe("excellent");
  });

  it("returns offline when disconnected", () => {
    const report = computeHealth({ ...base, connected: false }, [], DEFAULT_SETTINGS);
    expect(report.band).toBe("offline");
    expect(report.score).toBe(0);
  });
});
