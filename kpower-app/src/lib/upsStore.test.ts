import { describe, expect, it, beforeEach } from "vitest";
import { parseSnapshot, __resetUpsStoreForTests } from "./upsStore";

beforeEach(() => {
  __resetUpsStoreForTests();
});

describe("parseSnapshot", () => {
  it("parseSnapshot_rejects_garbage", () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot({})).toBeNull();
    expect(parseSnapshot({ connected: true, mode: "nope" })).toBeNull();
  });

  it("accepts a valid snapshot", () => {
    const snap = parseSnapshot({
      connected: true,
      mode: "battery",
      loadPercent: 10,
      batteryPercent: 80,
      runtimeSeconds: 100,
      inputVoltage: 230,
      outputVoltage: 229,
      frequency: 50,
      temperatureC: 30,
      alarmCodes: ["A1"],
      timestampMs: 1,
    });
    expect(snap?.batteryPercent).toBe(80);
    expect(snap?.mode).toBe("battery");
  });
});
