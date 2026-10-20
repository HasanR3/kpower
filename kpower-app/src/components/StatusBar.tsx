import { BatteryCharging, Cable, Clock3, Unplug, Zap } from "lucide-react";
import type { UpsSnapshot } from "../lib/types";

function formatRuntime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function modeLabel(mode: UpsSnapshot["mode"]): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function StatusBar({ snapshot }: { snapshot: UpsSnapshot | null }) {
  if (!snapshot || !snapshot.connected) {
    return (
      <header className="status-bar" data-testid="status-bar">
        <span className="brand-mark">
          <Zap className="brand-mark__icon" aria-hidden size={16} strokeWidth={2.25} />
          KPower
        </span>
        <span className="status-pill status-pill--danger">
          <Unplug aria-hidden size={13} strokeWidth={2} />
          Disconnected
        </span>
      </header>
    );
  }

  return (
    <header className="status-bar" data-testid="status-bar">
      <span className="brand-mark">
        <Zap className="brand-mark__icon" aria-hidden size={16} strokeWidth={2.25} />
        KPower
      </span>
      <span className="status-pill status-pill--ok">
        <Cable aria-hidden size={13} strokeWidth={2} />
        Connected
      </span>
      <span className="status-meta">
        <BatteryCharging aria-hidden size={13} strokeWidth={2} />
        {modeLabel(snapshot.mode)}
      </span>
      <span className="status-meta">
        <Clock3 aria-hidden size={13} strokeWidth={2} />
        Runtime {formatRuntime(snapshot.runtimeSeconds)}
      </span>
    </header>
  );
}
