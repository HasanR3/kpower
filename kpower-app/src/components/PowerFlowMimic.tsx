import type { UpsMode } from "../lib/types";

export function PowerFlowMimic({ mode, connected }: { mode: UpsMode; connected: boolean }) {
  const onBattery = connected && mode === "battery";
  return (
    <div className="mimic" aria-label="Power flow">
      <div className={connected && !onBattery ? "mimic-node mimic-node--live" : "mimic-node"}>
        Utility
      </div>
      <div className="mimic-arrow" aria-hidden>
        →
      </div>
      <div className={connected ? "mimic-node mimic-node--live" : "mimic-node"}>UPS</div>
      <div className="mimic-arrow" aria-hidden>
        →
      </div>
      <div className={connected ? "mimic-node mimic-node--live" : "mimic-node"}>Load</div>
      <div className={onBattery ? "mimic-battery mimic-battery--active" : "mimic-battery"}>
        Battery {onBattery ? "supplying" : "standby"}
      </div>
    </div>
  );
}
