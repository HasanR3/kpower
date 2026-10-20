import { useEffect, useState } from "react";
import {
  Activity,
  BatteryMedium,
  Gauge,
  PlugZap,
  Thermometer,
  Zap,
} from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { PowerTopology } from "../components/PowerTopology";
import { VoltageChart, type VoltagePoint } from "../components/VoltageChart";
import { formatRuntime } from "../lib/healthScore";
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
        <header className="device-hero">
          <div>
            <p className="overview-kicker">Telemetry</p>
            <h1>Device</h1>
            <p className="overview-sub">Live electrical readings from the attached UPS</p>
          </div>
        </header>
        <div className="device-empty">
          <p className="empty-state">UPS not connected</p>
          <p className="muted">
            Reconnect the USB cable, or close stock KPower if it is holding the device exclusively.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="page device-page">
      <header className="device-hero">
        <div>
          <p className="overview-kicker">Telemetry</p>
          <h1>Device</h1>
          <p className="overview-sub">
            Operating on {snapshot.mode} · estimated runtime {formatRuntime(snapshot.runtimeSeconds)}
          </p>
        </div>
      </header>

      <div className="metric-grid">
        <MetricTile
          Icon={Gauge}
          label="Output load"
          value={fmt(snapshot.loadPercent, 0)}
          unit="%"
          hint="Share of rated capacity"
        />
        <MetricTile
          Icon={BatteryMedium}
          label="Battery capacity"
          value={fmt(snapshot.batteryPercent, 0)}
          unit="%"
          hint="Remaining charge"
        />
        <MetricTile
          Icon={Zap}
          label="Voltage in"
          value={fmt(snapshot.inputVoltage, 1)}
          unit="V"
          hint="Utility / input"
        />
        <MetricTile
          Icon={PlugZap}
          label="Voltage out"
          value={fmt(snapshot.outputVoltage, 1)}
          unit="V"
          hint="Protected output"
        />
        <MetricTile
          Icon={Activity}
          label="Frequency"
          value={fmt(snapshot.frequency, 1)}
          unit="Hz"
          hint="Output line frequency"
        />
        <MetricTile
          Icon={Thermometer}
          label="Temperature"
          value={fmt(snapshot.temperatureC, 1)}
          unit="°C"
          hint="Internal sensor"
        />
      </div>

      <PowerTopology snapshot={snapshot} />

      <div className="device-panels device-panels--chart-only">
        <VoltageChart points={points} />
      </div>
    </section>
  );
}
