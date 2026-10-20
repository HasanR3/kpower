import { describe, expect, it } from "vitest";
import {
  exportHistoryCsv,
  isDestructive,
  runSimulatedCommand,
  type HistorySample,
} from "./appData";

describe("appData", () => {
  it("marks upsOff as destructive", () => {
    expect(isDestructive("upsOff")).toBe(true);
    expect(isDestructive("selfTest")).toBe(false);
  });

  it("rejects non-on commands when disconnected", () => {
    const result = runSimulatedCommand("selfTest", false);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/not connected/i);
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
