import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BatteryMedium,
  BellRing,
  Cable,
  ClipboardList,
  Gauge,
  History,
  Settings2,
  ShieldAlert,
  Timer,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppRoute } from "../components/AppNav";
import { PowerTopology } from "../components/PowerTopology";
import {
  loadAlarms,
  loadCommandResults,
  loadHistory,
  loadSettings,
  type AlarmRecord,
  type CommandResult,
  type HistorySample,
} from "../lib/appData";
import {
  computeHealth,
  downsampleHistory,
  formatRuntime,
} from "../lib/healthScore";
import {
  DEFAULT_DEVICE,
  deriveMonitoringStatus,
  formatLastUpdate,
  liveValue,
  loadDevices,
} from "../lib/monitoring";
import type { UpsSnapshot } from "../lib/types";
import { getLastSuccessfulPollAt, getUpsLinkError } from "../lib/upsStore";

export function OverviewPage({
  snapshot,
  onNavigate,
}: {
  snapshot: UpsSnapshot | null;
  onNavigate: (route: AppRoute) => void;
}) {
  const [alarms, setAlarms] = useState<AlarmRecord[]>(() => loadAlarms());
  const [history, setHistory] = useState<HistorySample[]>(() => loadHistory());
  const [events, setEvents] = useState<CommandResult[]>(() => loadCommandResults());
  const [now, setNow] = useState(() => Date.now());
  const settings = useMemo(() => loadSettings(), []);
  const device = useMemo(() => loadDevices()[0] ?? DEFAULT_DEVICE, []);

  useEffect(() => {
    const id = setInterval(() => {
      setAlarms(loadAlarms());
      setHistory(loadHistory());
      setEvents(loadCommandResults());
      setNow(Date.now());
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const status = useMemo(
    () =>
      deriveMonitoringStatus(
        snapshot,
        getLastSuccessfulPollAt(),
        getUpsLinkError(),
        now,
      ),
    [snapshot, now],
  );

  const health = useMemo(
    () => computeHealth(snapshot, alarms, settings),
    [snapshot, alarms, settings],
  );

  const activeAlarms = alarms.filter((a) => a.active);
  const connected = Boolean(snapshot?.connected);
  const showLive = connected && (status.comms === "live" || status.comms === "stale");

  const chartData = useMemo(
    () =>
      downsampleHistory(history.slice(-180), 40).map((s) => ({
        t: new Date(s.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        load: Number(s.loadPercent.toFixed(1)),
        battery: Number(s.batteryPercent.toFixed(1)),
      })),
    [history],
  );

  const v = (fmt: () => string) => liveValue(status, connected, fmt);

  return (
    <section className="page overview">
      <header className="ops-masthead">
        <div className="ops-masthead__main">
          <p className="ops-masthead__kicker">Monitoring console</p>
          <h1 className="ops-masthead__title">{device.name}</h1>
          <p className="ops-masthead__sub">
            {device.manufacturer} · {device.model} · {device.location}
          </p>
        </div>
        <dl className="ops-masthead__meta">
          <div>
            <dt>Comms</dt>
            <dd className={`ops-tag ops-tag--${status.comms}`}>{status.message}</dd>
          </div>
          <div>
            <dt>UPS mode</dt>
            <dd>{status.upsMode}</dd>
          </div>
          <div>
            <dt>Last update</dt>
            <dd className="tabular">{formatLastUpdate(status.lastUpdateMs)}</dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd className="tabular">
              {showLive ? health.score : "—"}{" "}
              <span className="muted">{showLive ? health.band : "n/a"}</span>
            </dd>
          </div>
        </dl>
      </header>

      {!showLive ? (
        <p className="banner banner--warn" role="status">
          {status.comms === "bridge_down"
            ? "HID bridge unreachable. Run npm run hid with stock KPower closed."
            : "UPS offline or unreachable. Readings below are not live."}
        </p>
      ) : status.comms === "stale" ? (
        <p className="banner banner--warn" role="status">
          Telemetry is stale — values may not reflect the UPS right now.
        </p>
      ) : null}

      <div className="kpi-rail" role="group" aria-label="Key performance indicators">
        <article className="kpi">
          <div className="kpi__label">
            <Cable aria-hidden size={14} strokeWidth={2} /> Link
          </div>
          <div
            className={`kpi__value ${
              status.comms === "live" ? "is-ok" : status.comms === "stale" ? "is-warn" : "is-bad"
            }`}
          >
            {status.comms === "live"
              ? "Live"
              : status.comms === "stale"
                ? "Stale"
                : status.comms === "bridge_down"
                  ? "Bridge"
                  : "Down"}
          </div>
          <div className="kpi__meta">{device.protocol.toUpperCase()}</div>
        </article>
        <article className="kpi">
          <div className="kpi__label">
            <Gauge aria-hidden size={14} strokeWidth={2} /> Load
          </div>
          <div className="kpi__value kpi__value--num">
            {v(() => snapshot!.loadPercent.toFixed(0))}
            {showLive ? <span className="kpi__unit">%</span> : null}
          </div>
          <div className="kpi__meta">Output utilization</div>
        </article>
        <article className="kpi">
          <div className="kpi__label">
            <BatteryMedium aria-hidden size={14} strokeWidth={2} /> Battery
          </div>
          <div className="kpi__value kpi__value--num">
            {v(() => snapshot!.batteryPercent.toFixed(0))}
            {showLive ? <span className="kpi__unit">%</span> : null}
          </div>
          <div className="kpi__meta">
            {showLive ? `Runtime ${formatRuntime(snapshot!.runtimeSeconds)}` : "Unavailable"}
          </div>
        </article>
        <article className="kpi">
          <div className="kpi__label">
            <BellRing aria-hidden size={14} strokeWidth={2} /> Alarms
          </div>
          <div className={`kpi__value kpi__value--num ${activeAlarms.length ? "is-warn" : ""}`}>
            {activeAlarms.length}
          </div>
          <div className="kpi__meta">Active conditions</div>
        </article>
        <article className="kpi">
          <div className="kpi__label">
            <Timer aria-hidden size={14} strokeWidth={2} /> Policy
          </div>
          <div className="kpi__value kpi__value--num">
            {showLive && health.minutesToPolicyShutdown != null
              ? Math.max(0, Math.round(health.minutesToPolicyShutdown))
              : "—"}
            {showLive && health.minutesToPolicyShutdown != null ? (
              <span className="kpi__unit">min</span>
            ) : null}
          </div>
          <div className="kpi__meta">
            ≤ {settings.shutdownBatteryPercent}% / {settings.shutdownRuntimeSeconds}s
          </div>
        </article>
      </div>

      <PowerTopology snapshot={snapshot} />

      <div className="overview-grid">
        <section className="panel panel--chart">
          <div className="panel__head">
            <h2>
              <Activity aria-hidden size={16} strokeWidth={2} /> Load & reserve
            </h2>
            <span className="panel__tag">{settings.historyRetentionDays}d retention</span>
          </div>
          {chartData.length < 2 ? (
            <p className="panel__empty">
              Collecting telemetry… keep the app open with the HID bridge running.
            </p>
          ) : (
            <div className="overview-chart">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="batFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f7a45" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0f7a45" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e6ebf1" vertical={false} />
                  <XAxis
                    dataKey="t"
                    tick={{ fill: "#7a8796", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#7a8796", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 6,
                      border: "1px solid #d8dee6",
                      boxShadow: "none",
                      fontFamily: "var(--font)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="load"
                    name="Load %"
                    stroke="#1d4ed8"
                    fill="url(#loadFill)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="battery"
                    name="Battery %"
                    stroke="#0f7a45"
                    fill="url(#batFill)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="panel__head">
            <h2>
              <ShieldAlert aria-hidden size={16} strokeWidth={2} /> Active alarms
            </h2>
            <button type="button" className="linkish" onClick={() => onNavigate("alarms")}>
              Open
            </button>
          </div>
          {activeAlarms.length === 0 ? (
            <p className="panel__empty">No active alarms.</p>
          ) : (
            <ul className="feed-list">
              {activeAlarms.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <span className={`sev sev--${a.severity}`} />
                  <div>
                    <strong>{a.code}</strong>
                    <div className="muted tiny">{a.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="panel__head panel__head--spaced">
            <h2>Risk factors</h2>
          </div>
          <ul className="factor-list">
            {health.factors.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </aside>

        <section className="panel">
          <div className="panel__head">
            <h2>
              <Zap aria-hidden size={16} strokeWidth={2} /> Electrical
            </h2>
            <button type="button" className="linkish" onClick={() => onNavigate("device")}>
              Device
            </button>
          </div>
          <dl className="spec-grid">
            <div>
              <dt>Input voltage</dt>
              <dd>{v(() => `${snapshot!.inputVoltage.toFixed(1)} V`)}</dd>
            </div>
            <div>
              <dt>Output voltage</dt>
              <dd>{v(() => `${snapshot!.outputVoltage.toFixed(1)} V`)}</dd>
            </div>
            <div>
              <dt>Frequency</dt>
              <dd>{v(() => `${snapshot!.frequency.toFixed(1)} Hz`)}</dd>
            </div>
            <div>
              <dt>Battery cell</dt>
              <dd>{v(() => `${snapshot!.batterySingleVoltage.toFixed(2)} V`)}</dd>
            </div>
            <div>
              <dt>Load</dt>
              <dd>{v(() => `${snapshot!.loadPercent.toFixed(0)} %`)}</dd>
            </div>
            <div>
              <dt>Temperature</dt>
              <dd>{v(() => `${snapshot!.temperatureC.toFixed(1)} °C`)}</dd>
            </div>
            <div>
              <dt>Protocol</dt>
              <dd>HID (SNMP/NUT stubbed)</dd>
            </div>
            <div>
              <dt>Poll</dt>
              <dd>{settings.pollIntervalMs} ms</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>
              <ClipboardList aria-hidden size={16} strokeWidth={2} /> Control activity
            </h2>
            <button type="button" className="linkish" onClick={() => onNavigate("control")}>
              Control
            </button>
          </div>
          {!settings.allowControl ? (
            <p className="panel__empty">
              Control writes are off. Enable “Allow control” in Settings only when needed.
            </p>
          ) : null}
          {events.length === 0 ? (
            <p className="panel__empty">No recent commands.</p>
          ) : (
            <ul className="feed-list">
              {events.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <span className={`sev ${e.ok ? "sev--ok" : "sev--critical"}`} />
                  <div>
                    <strong>{e.command}</strong>
                    <div className="muted tiny">{e.message}</div>
                    <div className="muted tiny">{new Date(e.at).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="overview-actions">
        <button type="button" className="btn btn--primary" onClick={() => onNavigate("device")}>
          <Zap aria-hidden size={15} strokeWidth={2} /> Device detail
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => onNavigate("alarms")}>
          <BellRing aria-hidden size={15} strokeWidth={2} /> Alarms
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => onNavigate("history")}>
          <History aria-hidden size={15} strokeWidth={2} /> History
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => onNavigate("settings")}>
          <Settings2 aria-hidden size={15} strokeWidth={2} /> Settings
        </button>
      </div>
    </section>
  );
}
