import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BatteryMedium,
  Gauge,
  Info,
  PlugZap,
  Thermometer,
  Zap,
} from "lucide-react";
import { GaugeDial } from "../components/GaugeDial";
import { MetricTile } from "../components/MetricTile";
import { PowerTopology } from "../components/PowerTopology";
import { VoltageChart, type VoltagePoint } from "../components/VoltageChart";
import { formatRuntime } from "../lib/healthScore";
import { loadSettings } from "../lib/appData";
import type { UpsSnapshot } from "../lib/types";

const MAX_POINTS = 60;

type DeviceTab = "mimic" | "dial" | "data" | "chart" | "info";

function fmt(n: number, digits = 0): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function formatHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function DevicePage({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const [points, setPoints] = useState<VoltagePoint[]>([]);
  const [tab, setTab] = useState<DeviceTab>("mimic");
  const settings = useMemo(() => loadSettings(), []);

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

  const connected = Boolean(snapshot?.connected);
  const onBattery = connected && snapshot?.mode === "battery";
  const fault = connected && snapshot?.mode === "fault";

  const shutdownCountdown =
    connected && onBattery && settings.powerControlEnabled
      ? formatHms(settings.shutdownMinutesOnLowBattery * 60)
      : "--:--:--";

  const statusCells = [
    {
      label: "UPS communication",
      value: connected ? "Connected" : "Disconnected",
      ok: connected,
    },
    {
      label: "Input status",
      value: !connected ? "Unknown" : snapshot!.inputVoltage > 50 ? "Normal" : "Abnormal",
      ok: connected && snapshot!.inputVoltage > 50,
    },
    {
      label: "Battery voltage",
      value: !connected ? "Unknown" : snapshot!.batteryPercent > 20 ? "Normal" : "Low",
      ok: connected && snapshot!.batteryPercent > 20,
    },
    {
      label: "UPS fault",
      value: fault ? "Fault" : "Normal",
      ok: !fault,
    },
    {
      label: "Work status",
      value: !connected ? "Offline" : onBattery ? "On battery" : snapshot!.mode === "bypass" ? "Bypass" : "On mains",
      ok: connected && !fault,
    },
    {
      label: "UPS self-test",
      value: "No",
      ok: true,
    },
  ];

  return (
    <section className="page enterprise-page device-page">
      <div className="device-status-banner">
        <div className="device-status-banner__lead">
          <div className={`device-ups-glyph ${connected ? "is-live" : ""}`} aria-hidden />
          <div>
            <strong className={connected ? "is-ok-text" : "text-danger"}>
              {connected ? "UPS connected" : "UPS disconnected"}
            </strong>
            <p className="muted tiny">
              {connected
                ? `Work status: ${onBattery ? "On battery" : "On mains"} · Runtime ${formatRuntime(snapshot!.runtimeSeconds)}`
                : "Attach the UPS or close stock KPower if it holds the USB device."}
            </p>
          </div>
        </div>
        <div className="device-countdowns">
          <div>
            <span className="stat-chip__label">System shutdown countdown</span>
            <strong className="device-countdown">{shutdownCountdown}</strong>
            <div className="meter">
              <i style={{ width: shutdownCountdown === "--:--:--" ? "0%" : "35%" }} />
            </div>
          </div>
          <div>
            <span className="stat-chip__label">Battery remaining time</span>
            <strong className="device-countdown">
              {connected ? formatHms(snapshot!.runtimeSeconds) : "--:--:--"}
            </strong>
            <div className="meter meter--ok">
              <i
                style={{
                  width: connected ? `${Math.min(100, snapshot!.batteryPercent)}%` : "0%",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="status-matrix">
        {statusCells.map((cell) => (
          <article key={cell.label} className="status-matrix__cell">
            <span className="stat-chip__label">{cell.label}</span>
            <strong className={cell.ok ? "is-ok-text" : "text-danger"}>{cell.value}</strong>
          </article>
        ))}
      </div>

      <div className="device-tabs" role="tablist" aria-label="Device views">
        {(
          [
            ["mimic", "Mimic"],
            ["dial", "Dial"],
            ["data", "Data"],
            ["chart", "Chart"],
            ["info", "Info"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "device-tab is-active" : "device-tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {!connected && tab !== "info" ? (
        <div className="device-empty">
          <p className="empty-state">UPS not connected</p>
          <p className="muted">Reconnect USB or free the device from stock KPower.</p>
        </div>
      ) : null}

      {connected && tab === "mimic" ? <PowerTopology snapshot={snapshot} /> : null}

      {connected && tab === "dial" ? (
        <div className="dial-row panel">
          <GaugeDial label="UPS load" value={snapshot!.loadPercent} max={100} unit="%" />
          <GaugeDial label="Battery capacity" value={snapshot!.batteryPercent} max={100} unit="%" />
        </div>
      ) : null}

      {connected && tab === "data" ? (
        <div className="metric-grid">
          <MetricTile Icon={Gauge} label="Output load" value={fmt(snapshot!.loadPercent, 0)} unit="%" hint="Share of rated capacity" />
          <MetricTile Icon={BatteryMedium} label="Battery capacity" value={fmt(snapshot!.batteryPercent, 0)} unit="%" hint="Remaining charge" />
          <MetricTile Icon={Zap} label="Voltage in" value={fmt(snapshot!.inputVoltage, 1)} unit="V" hint="Utility / input" />
          <MetricTile Icon={PlugZap} label="Voltage out" value={fmt(snapshot!.outputVoltage, 1)} unit="V" hint="Protected output" />
          <MetricTile Icon={Activity} label="Frequency" value={fmt(snapshot!.frequency, 1)} unit="Hz" hint="Output line frequency" />
          <MetricTile Icon={Thermometer} label="Temperature" value={fmt(snapshot!.temperatureC, 1)} unit="°C" hint="Internal sensor" />
        </div>
      ) : null}

      {connected && tab === "chart" ? (
        <div className="device-panels device-panels--chart-only">
          <VoltageChart points={points} />
        </div>
      ) : null}

      {tab === "info" ? (
        <section className="panel">
          <div className="panel__head">
            <h2>
              <Info aria-hidden size={16} strokeWidth={2} /> Device information
            </h2>
          </div>
          <dl className="spec-grid">
            <div>
              <dt>Product</dt>
              <dd>KPower monitor</dd>
            </div>
            <div>
              <dt>Communication</dt>
              <dd>{settings.commsType === "usb" ? "USB HID" : "Serial"}</dd>
            </div>
            <div>
              <dt>Connection</dt>
              <dd>{connected ? "Connected" : "Disconnected"}</dd>
            </div>
            <div>
              <dt>Work mode</dt>
              <dd>{connected ? snapshot!.mode : "—"}</dd>
            </div>
            <div>
              <dt>Estimated runtime</dt>
              <dd>{connected ? formatRuntime(snapshot!.runtimeSeconds) : "—"}</dd>
            </div>
            <div>
              <dt>Poll interval</dt>
              <dd>{settings.pollIntervalMs} ms</dd>
            </div>
          </dl>
        </section>
      ) : null}
    </section>
  );
}
