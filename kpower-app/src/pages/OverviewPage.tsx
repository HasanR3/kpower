import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BatteryMedium,
  BellRing,
  Cable,
  ClipboardList,
  Gauge,
  HeartPulse,
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
import type { UpsSnapshot } from "../lib/types";

function bandLabel(band: string): string {
  switch (band) {
    case "excellent":
      return "Nominal";
    case "good":
      return "Stable";
    case "degraded":
      return "Attention";
    case "critical":
      return "Critical";
    default:
      return "Offline";
  }
}

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
  const settings = useMemo(() => loadSettings(), []);

  useEffect(() => {
    const id = setInterval(() => {
      setAlarms(loadAlarms());
      setHistory(loadHistory());
      setEvents(loadCommandResults());
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const health = useMemo(
    () => computeHealth(snapshot, alarms, settings),
    [snapshot, alarms, settings],
  );

  const activeAlarms = alarms.filter((a) => a.active);
  const chartData = useMemo(
    () =>
      downsampleHistory(history.slice(-180), 40).map((s) => ({
        t: new Date(s.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        load: Number(s.loadPercent.toFixed(1)),
        battery: Number(s.batteryPercent.toFixed(1)),
      })),
    [history],
  );

  const connected = Boolean(snapshot?.connected);
  const nowLabel = new Date().toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="page overview">
      <header className="overview-hero">
        <div>
          <p className="overview-kicker">Operations</p>
          <h1>Power infrastructure</h1>
          <p className="overview-sub">
            Live UPS posture for this host · {nowLabel}
          </p>
        </div>
        <div className={`health-orb health-orb--${health.band}`} aria-label={`Health ${health.score}`}>
          <HeartPulse className="health-orb__icon" aria-hidden size={18} strokeWidth={2} />
          <div className="health-orb__score">{health.score}</div>
          <div className="health-orb__band">{bandLabel(health.band)}</div>
          <div className="health-orb__caption">Health index</div>
        </div>
      </header>

      <div className="kpi-rail" role="group" aria-label="Key performance indicators">
        <article className="kpi">
          <div className="kpi__label">
            <Cable aria-hidden size={14} strokeWidth={2} /> Link
          </div>
          <div className={`kpi__value ${connected ? "is-ok" : "is-bad"}`}>
            {connected ? "Online" : "Down"}
          </div>
          <div className="kpi__meta">{connected ? snapshot?.mode ?? "—" : "No telemetry"}</div>
        </article>
        <article className="kpi">
          <div className="kpi__label">
            <Gauge aria-hidden size={14} strokeWidth={2} /> Load
          </div>
          <div className="kpi__value kpi__value--num">
            {connected ? snapshot!.loadPercent.toFixed(0) : "—"}
            <span className="kpi__unit">%</span>
          </div>
          <div className="kpi__meta">Output utilization</div>
        </article>
        <article className="kpi">
          <div className="kpi__label">
            <BatteryMedium aria-hidden size={14} strokeWidth={2} /> Battery
          </div>
          <div className="kpi__value kpi__value--num">
            {connected ? snapshot!.batteryPercent.toFixed(0) : "—"}
            <span className="kpi__unit">%</span>
          </div>
          <div className="kpi__meta">
            {connected ? `Runtime ${formatRuntime(snapshot!.runtimeSeconds)}` : "Unavailable"}
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
            <Timer aria-hidden size={14} strokeWidth={2} /> Policy window
          </div>
          <div className="kpi__value kpi__value--num">
            {health.minutesToPolicyShutdown == null
              ? "—"
              : Math.max(0, Math.round(health.minutesToPolicyShutdown))}
            {health.minutesToPolicyShutdown != null ? (
              <span className="kpi__unit">min</span>
            ) : null}
          </div>
          <div className="kpi__meta">
            Auto-shutdown ≤ {settings.shutdownBatteryPercent}% / {settings.shutdownRuntimeSeconds}s
          </div>
        </article>
      </div>

      <div className="overview-grid">
        <section className="panel panel--chart">
          <div className="panel__head">
            <h2>
              <Activity aria-hidden size={16} strokeWidth={2} /> Load & reserve
            </h2>
            <span className="panel__tag">Rolling samples</span>
          </div>
          {chartData.length < 2 ? (
            <p className="panel__empty">
              Collecting telemetry… keep Overview or Device open for a few seconds.
            </p>
          ) : (
            <div className="overview-chart">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2f6fed" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#2f6fed" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="batFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1f9d55" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#1f9d55" stopOpacity={0} />
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
                      borderRadius: 8,
                      border: "1px solid #d8dee6",
                      boxShadow: "none",
                      fontFamily: "var(--font)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="load"
                    name="Load %"
                    stroke="#2f6fed"
                    fill="url(#loadFill)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="battery"
                    name="Battery %"
                    stroke="#1f9d55"
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
              <ShieldAlert aria-hidden size={16} strokeWidth={2} /> Risk factors
            </h2>
          </div>
          <ul className="factor-list">
            {health.factors.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div className="panel__head panel__head--spaced">
            <h2>Active alarms</h2>
            <button type="button" className="linkish" onClick={() => onNavigate("alarms")}>
              Open
            </button>
          </div>
          {activeAlarms.length === 0 ? (
            <p className="panel__empty">No active alarms.</p>
          ) : (
            <ul className="feed-list">
              {activeAlarms.slice(0, 5).map((a) => (
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
        </aside>

        <section className="panel">
          <div className="panel__head">
            <h2>
              <Zap aria-hidden size={16} strokeWidth={2} /> Electrical snapshot
            </h2>
            <button type="button" className="linkish" onClick={() => onNavigate("device")}>
              Device detail
            </button>
          </div>
          <dl className="spec-grid">
            <div>
              <dt>Input</dt>
              <dd>{connected ? `${snapshot!.inputVoltage.toFixed(1)} V` : "—"}</dd>
            </div>
            <div>
              <dt>Output</dt>
              <dd>{connected ? `${snapshot!.outputVoltage.toFixed(1)} V` : "—"}</dd>
            </div>
            <div>
              <dt>Frequency</dt>
              <dd>{connected ? `${snapshot!.frequency.toFixed(1)} Hz` : "—"}</dd>
            </div>
            <div>
              <dt>Temperature</dt>
              <dd>{connected ? `${snapshot!.temperatureC.toFixed(1)} °C` : "—"}</dd>
            </div>
            <div>
              <dt>Comms</dt>
              <dd>{settings.commsType.toUpperCase()}</dd>
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
              Commands
            </button>
          </div>
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
        <button type="button" className="btn btn--primary" onClick={() => onNavigate("control")}>
          <Zap aria-hidden size={15} strokeWidth={2} /> Issue command
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => onNavigate("history")}>
          <History aria-hidden size={15} strokeWidth={2} /> Audit history
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => onNavigate("settings")}>
          <Settings2 aria-hidden size={15} strokeWidth={2} /> Policies
        </button>
      </div>
    </section>
  );
}
