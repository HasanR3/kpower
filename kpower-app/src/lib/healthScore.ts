import type { AlarmRecord, AppSettings, HistorySample } from "./appData";
import type { UpsSnapshot } from "./types";

export type HealthBand = "excellent" | "good" | "degraded" | "critical" | "offline";

export interface HealthReport {
  score: number;
  band: HealthBand;
  factors: string[];
  minutesToPolicyShutdown: number | null;
}

export function computeHealth(
  snapshot: UpsSnapshot | null,
  alarms: AlarmRecord[],
  settings: AppSettings,
): HealthReport {
  if (!snapshot || !snapshot.connected) {
    return {
      score: 0,
      band: "offline",
      factors: ["No UPS telemetry"],
      minutesToPolicyShutdown: null,
    };
  }

  let score = 100;
  const factors: string[] = [];

  if (snapshot.mode === "battery") {
    score -= 18;
    factors.push("Operating on battery");
  } else if (snapshot.mode === "fault") {
    score -= 45;
    factors.push("Fault state reported");
  } else if (snapshot.mode === "bypass") {
    score -= 22;
    factors.push("Bypass active");
  }

  if (snapshot.loadPercent > 90) {
    score -= 20;
    factors.push("Load above 90%");
  } else if (snapshot.loadPercent > 75) {
    score -= 10;
    factors.push("Load elevated");
  }

  if (snapshot.batteryPercent < settings.shutdownBatteryPercent) {
    score -= 35;
    factors.push("Battery below shutdown policy");
  } else if (snapshot.batteryPercent < settings.shutdownBatteryPercent + 15) {
    score -= 15;
    factors.push("Battery near shutdown policy");
  }

  const activeCritical = alarms.filter((a) => a.active && a.severity === "critical").length;
  const activeWarn = alarms.filter((a) => a.active && a.severity === "warning").length;
  score -= activeCritical * 18;
  score -= activeWarn * 8;
  if (activeCritical) factors.push(`${activeCritical} critical alarm(s)`);
  if (activeWarn) factors.push(`${activeWarn} warning alarm(s)`);

  score = Math.max(0, Math.min(100, Math.round(score)));

  let band: HealthBand = "excellent";
  if (score < 40) band = "critical";
  else if (score < 65) band = "degraded";
  else if (score < 85) band = "good";

  let minutesToPolicyShutdown: number | null = null;
  if (snapshot.mode === "battery" && snapshot.runtimeSeconds > 0) {
    const byRuntime = snapshot.runtimeSeconds / 60;
    const byPolicy = Math.max(
      0,
      (snapshot.batteryPercent - settings.shutdownBatteryPercent) *
        (snapshot.runtimeSeconds / Math.max(snapshot.batteryPercent, 1) / 60),
    );
    minutesToPolicyShutdown = Math.min(byRuntime, byPolicy);
  }

  if (factors.length === 0) factors.push("Within operating envelope");

  return { score, band, factors, minutesToPolicyShutdown };
}

export function downsampleHistory(samples: HistorySample[], maxPoints = 48): HistorySample[] {
  if (samples.length <= maxPoints) return samples;
  const step = samples.length / maxPoints;
  const out: HistorySample[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(samples[Math.floor(i * step)]);
  }
  return out;
}

export function formatRuntime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m`;
}
