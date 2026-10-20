import { describe, expect, it } from "vitest";
import {
  exportHistoryCsv,
  isDestructive,
  runControlCommand,
  syncAlarmsFromSnapshot,
  type HistorySample,
} from "./appData";
import { snapshotFixture } from "./snapshotFixture";

describe("appData", () => {
  it("marks close output and EOD self-test as destructive", () => {
    expect(isDestructive("closeOutputMinutes")).toBe(true);
    expect(isDestructive("selfTestEod")).toBe(true);
    expect(isDestructive("selfTest10s")).toBe(false);
  });

  it("rejects commands when disconnected", () => {
    const result = runControlCommand("selfTest10s", false);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/not connected/i);
  });

  it("does not pretend control commands succeed while HID writes are unmapped", () => {
    const result = runControlCommand("selfTest10s", true);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/not sent/i);
  });

  it("syncs live ON_BATTERY into active alarms and clears when gone", () => {
    const onBat = syncAlarmsFromSnapshot(
      [],
      snapshotFixture({ mode: "battery", alarmCodes: ["ON_BATTERY"] }),
    );
    expect(onBat).toHaveLength(1);
    expect(onBat[0].code).toBe("ON_BATTERY");
    expect(onBat[0].active).toBe(true);

    const cleared = syncAlarmsFromSnapshot(
      onBat,
      snapshotFixture({ mode: "line", alarmCodes: [] }),
    );
    expect(cleared[0].active).toBe(false);
    expect(cleared[0].clearedAt).toBeTypeOf("number");
  });

  it("exports CSV with header", () => {
    const samples: HistorySample[] = [
      {
        at: 1_700_000_000_000,
        loadPercent: 10,
        batteryPercent: 90,
        inputVoltage: 230,
        outputVoltage: 229,
        connected: true,
        mode: "line",
      },
    ];
    const csv = exportHistoryCsv(samples);
    expect(csv.split("\n")[0]).toContain("timestamp");
    expect(csv).toContain("line");
  });
});
