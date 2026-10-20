import { useEffect, useState } from "react";
import { BatteryCharging, Cable, Clock3, Radio, Unplug, Usb, Zap } from "lucide-react";
import {
  deriveMonitoringStatus,
  formatLastUpdate,
  type CommsState,
} from "../lib/monitoring";
import type { UpsSnapshot } from "../lib/types";
import { getLastSuccessfulPollAt, getUpsLinkError } from "../lib/upsStore";

function modeLabel(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function pillClass(comms: CommsState): string {
  if (comms === "live") return "status-pill status-pill--ok";
  if (comms === "stale") return "status-pill status-pill--warn";
  return "status-pill status-pill--danger";
}

function pillLabel(comms: CommsState): string {
  switch (comms) {
    case "live":
      return "Live";
    case "stale":
      return "Stale";
    case "bridge_down":
      return "Bridge down";
    default:
      return "Disconnected";
  }
}

export function StatusBar({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  void tick;
  const status = deriveMonitoringStatus(
    snapshot,
    getLastSuccessfulPollAt(),
    getUpsLinkError(),
  );

  return (
    <header className="status-bar" data-testid="status-bar">
      <span className="brand-mark">
        <Zap className="brand-mark__icon" aria-hidden size={16} strokeWidth={2.25} />
        KPower
      </span>
      <span className={pillClass(status.comms)}>
        {status.comms === "live" ? (
          <Cable aria-hidden size={13} strokeWidth={2} />
        ) : status.comms === "stale" ? (
          <Radio aria-hidden size={13} strokeWidth={2} />
        ) : (
          <Unplug aria-hidden size={13} strokeWidth={2} />
        )}
        {pillLabel(status.comms)}
      </span>
      <span className="status-meta" title={status.message}>
        <Usb aria-hidden size={13} strokeWidth={2} />
        {status.message}
      </span>
      {snapshot?.connected ? (
        <span className="status-meta">
          <BatteryCharging aria-hidden size={13} strokeWidth={2} />
          {modeLabel(snapshot.mode)}
        </span>
      ) : null}
      <span className="status-meta">
        <Clock3 aria-hidden size={13} strokeWidth={2} />
        Updated {formatLastUpdate(status.lastUpdateMs)}
      </span>
    </header>
  );
}
