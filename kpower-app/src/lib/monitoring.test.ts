import { describe, expect, it } from "vitest";
import { deriveMonitoringStatus } from "./monitoring";
import { snapshotFixture } from "./snapshotFixture";

describe("deriveMonitoringStatus", () => {
  it("marks bridge_down when no snapshot and bridge error", () => {
    const s = deriveMonitoringStatus(null, null, "HID bridge unreachable", 1000);
    expect(s.comms).toBe("bridge_down");
  });

  it("marks live when connected and fresh", () => {
    const snap = snapshotFixture({ connected: true, timestampMs: 900 });
    const s = deriveMonitoringStatus(snap, 950, null, 1000);
    expect(s.comms).toBe("live");
    expect(s.upsMode).toBe("line");
  });

  it("marks stale when last poll is old", () => {
    const snap = snapshotFixture({ connected: true, timestampMs: 1 });
    const s = deriveMonitoringStatus(snap, 1, null, 10_000);
    expect(s.comms).toBe("stale");
  });

  it("does not treat disconnect as UPS fault mode", () => {
    const snap = snapshotFixture({ connected: false });
    const s = deriveMonitoringStatus(snap, 1000, "UPS busy", 1000);
    expect(s.comms).toBe("disconnected");
    expect(s.upsMode).toBe("offline");
  });
});
