import { describe, expect, it, beforeEach } from "vitest";
import { parseSnapshot, __resetUpsStoreForTests } from "./upsStore";
import { STOCK_LINE_SNAPSHOT } from "./snapshotFixture";

beforeEach(() => {
  __resetUpsStoreForTests();
});

describe("parseSnapshot", () => {
  it("parseSnapshot_rejects_garbage", () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot({})).toBeNull();
    expect(parseSnapshot({ connected: true, mode: "nope" })).toBeNull();
  });

  it("rejects snapshots missing batterySingleVoltage", () => {
    const { batterySingleVoltage: _, ...rest } = STOCK_LINE_SNAPSHOT;
    expect(parseSnapshot(rest)).toBeNull();
  });

  it("accepts a valid stock-shaped snapshot", () => {
    const snap = parseSnapshot({ ...STOCK_LINE_SNAPSHOT, mode: "battery", batteryPercent: 80 });
    expect(snap?.batteryPercent).toBe(80);
    expect(snap?.batterySingleVoltage).toBe(2.26);
    expect(snap?.mode).toBe("battery");
  });
});
