import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./appData";
import { computeHealth } from "./healthScore";
import { snapshotFixture } from "./snapshotFixture";

describe("computeHealth", () => {
  it("scores healthy line mode highly", () => {
    const report = computeHealth(snapshotFixture(), [], DEFAULT_SETTINGS);
    expect(report.score).toBeGreaterThanOrEqual(85);
    expect(report.band).toBe("excellent");
  });

  it("returns offline when disconnected", () => {
    const report = computeHealth(
      snapshotFixture({ connected: false }),
      [],
      DEFAULT_SETTINGS,
    );
    expect(report.band).toBe("offline");
    expect(report.score).toBe(0);
  });
});
