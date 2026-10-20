import { useEffect, useState } from "react";
import { MetricTile } from "../components/MetricTile";
import { PowerFlowMimic } from "../components/PowerFlowMimic";
import { VoltageChart, type VoltagePoint } from "../components/VoltageChart";
import type { UpsSnapshot } from "../lib/types";

const MAX_POINTS = 60;

function fmt(n: number, digits = 0): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export function DevicePage({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const [points, setPoints] = useState<VoltagePoint[]>([]);

  useEffect(() => {
    if (!snapshot?.connected) return;
    setPoints((prev) => {
      const next = [
        ...prev,
        {
          t: snapshot.timestampMs,
          vin: snapshot.inputVoltage,
          vout: snapshot.outputVoltage,
        },
      ];
      return next.slice(-MAX_POINTS);
    });
  }, [snapshot]);

  if (!snapshot || !snapshot.connected) {
    return (
      <section className="page device-page">
        <h1>Device</h1>
        <p className="empty-state">UPS not connected</p>
        <p className="muted">Reconnect the USB cable or close stock KPower if it holds the device.</p>
      </section>
    );
  }

  return (
    <section className="page device-page">
      <h1>Device</h1>
      <div className="metric-grid">
        <MetricTile label="Load" value={fmt(snapshot.loadPercent, 0)} unit="%" />
        <MetricTile label="Battery" value={fmt(snapshot.batteryPercent, 0)} unit="%" />
        <MetricTile label="Vin" value={fmt(snapshot.inputVoltage, 1)} unit="V" />
        <MetricTile label="Vout" value={fmt(snapshot.outputVoltage, 1)} unit="V" />
        <MetricTile label="Frequency" value={fmt(snapshot.frequency, 1)} unit="Hz" />
        <MetricTile label="Temp" value={fmt(snapshot.temperatureC, 1)} unit="°C" />
      </div>
      <div className="device-panels">
        <PowerFlowMimic mode={snapshot.mode} connected={snapshot.connected} />
        <VoltageChart points={points} />
      </div>
    </section>
  );
}
