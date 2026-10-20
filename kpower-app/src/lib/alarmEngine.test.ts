import { describe, expect, it } from "vitest";
import { evaluateAlarms } from "./alarmEngine";
import { DEFAULT_SETTINGS } from "./appData";
import { snapshotFixture } from "./snapshotFixture";

describe("evaluateAlarms", () => {
  it("raises LOAD_CRIT from threshold without inventing device codes", () => {
    const snap = snapshotFixture({ loadPercent: 95, alarmCodes: [] });
    const next = evaluateAlarms([], snap, DEFAULT_SETTINGS, Date.now(), null);
    expect(next.some((a) => a.active && a.code === "LOAD_CRIT")).toBe(true);
  });

  it("clears LOAD_CRIT when load recovers", () => {
    const high = evaluateAlarms(
      [],
      snapshotFixture({ loadPercent: 95 }),
      DEFAULT_SETTINGS,
      Date.now(),
      null,
    );
    const ok = evaluateAlarms(
      high,
      snapshotFixture({ loadPercent: 20 }),
      DEFAULT_SETTINGS,
      Date.now(),
      null,
    );
    expect(ok.find((a) => a.code === "LOAD_CRIT")?.active).toBe(false);
  });

  it("uses COMMS_DOWN for bridge failure, not UPS_FAULT", () => {
    const next = evaluateAlarms(
      [],
      null,
      DEFAULT_SETTINGS,
      null,
      "HID bridge unreachable",
    );
    expect(next.some((a) => a.active && a.code === "COMMS_DOWN")).toBe(true);
    expect(next.some((a) => a.code === "UPS_FAULT")).toBe(false);
  });
});
