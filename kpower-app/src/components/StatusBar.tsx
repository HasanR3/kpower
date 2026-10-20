import { useEffect, useState } from "react";
import { BatteryCharging, Cable, Clock3, Unplug, Usb, Zap } from "lucide-react";
import type { UpsSnapshot } from "../lib/types";
import { getUpsLinkError } from "../lib/upsStore";

function formatRuntime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function modeLabel(mode: UpsSnapshot["mode"]): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function StatusBar({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const [linkError, setLinkError] = useState<string | null>(() => getUpsLinkError());

  useEffect(() => {
    const id = setInterval(() => setLinkError(getUpsLinkError()), 1000);
    return () => clearInterval(id);
  }, [snapshot]);

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
        <span className="status-meta" title={linkError ?? undefined}>
          <Usb aria-hidden size={13} strokeWidth={2} />
          {linkError ?? "Waiting for HID bridge / UPS"}
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
        <Usb aria-hidden size={13} strokeWidth={2} />
        Live HID
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
