import { Battery, Building2, PlugZap, Server } from "lucide-react";
import type { UpsMode } from "../lib/types";

function modeCopy(mode: UpsMode, onBattery: boolean): string {
  if (!onBattery && mode === "line") return "Utility feeding load through UPS";
  if (onBattery) return "Battery supplying load — utility unavailable";
  if (mode === "bypass") return "Bypass path active";
  if (mode === "fault") return "Fault condition reported";
  return "Operating mode unknown";
}

export function PowerFlowMimic({ mode, connected }: { mode: UpsMode; connected: boolean }) {
  const onBattery = connected && mode === "battery";
  const utilityLive = connected && !onBattery && mode !== "fault";

  return (
    <div className="mimic-panel" aria-label="Power flow">
      <div className="mimic-panel__head">
        <h2>Power path</h2>
        <span className="panel__tag">{connected ? mode : "offline"}</span>
      </div>

      <div className="mimic-flow">
        <div className={utilityLive ? "mimic-stage mimic-stage--live" : "mimic-stage"}>
          <Building2 aria-hidden size={20} strokeWidth={2} />
          <strong>Utility</strong>
          <span>{utilityLive ? "Present" : "Absent"}</span>
        </div>
        <div className={`mimic-connector ${utilityLive ? "mimic-connector--live" : ""}`} aria-hidden />
        <div className={connected ? "mimic-stage mimic-stage--live mimic-stage--core" : "mimic-stage"}>
          <Server aria-hidden size={20} strokeWidth={2} />
          <strong>UPS</strong>
          <span>{connected ? "Online" : "Offline"}</span>
        </div>
        <div className={`mimic-connector ${connected ? "mimic-connector--live" : ""}`} aria-hidden />
        <div className={connected ? "mimic-stage mimic-stage--live" : "mimic-stage"}>
          <PlugZap aria-hidden size={20} strokeWidth={2} />
          <strong>Protected load</strong>
          <span>{connected ? "Energized" : "No output"}</span>
        </div>
      </div>

      <div className={onBattery ? "mimic-reserve mimic-reserve--active" : "mimic-reserve"}>
        <Battery aria-hidden size={16} strokeWidth={2} />
        <div>
          <strong>{onBattery ? "Battery supplying" : "Battery on standby"}</strong>
          <p>{modeCopy(mode, onBattery)}</p>
        </div>
      </div>
    </div>
  );
}
