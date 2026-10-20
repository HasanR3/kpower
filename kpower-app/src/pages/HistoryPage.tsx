import { useEffect, useMemo, useState } from "react";
import { Download, History, LineChart, ScrollText } from "lucide-react";
import { PageHero } from "../components/PageHero";
import {
  controlCommandLabel,
  exportHistoryCsv,
  loadCommandResults,
  loadHistory,
  type CommandResult,
  type ControlCommand,
  type HistorySample,
} from "../lib/appData";

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function HistoryPage() {
  const [samples, setSamples] = useState<HistorySample[]>(() => loadHistory());
  const [events, setEvents] = useState<CommandResult[]>(() => loadCommandResults());
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const id = setInterval(() => {
      setSamples(loadHistory());
      setEvents(loadCommandResults());
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const fromTs = startOfDay(new Date(from).getTime());
    const toTs = startOfDay(new Date(to).getTime()) + 86_400_000;
    return samples.filter((s) => s.at >= fromTs && s.at < toTs);
  }, [samples, from, to]);

  const avgLoad = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.reduce((sum, s) => sum + s.loadPercent, 0) / filtered.length;
  }, [filtered]);

  const avgBattery = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.reduce((sum, s) => sum + s.batteryPercent, 0) / filtered.length;
  }, [filtered]);

  const onExport = () => {
    const csv = exportHistoryCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpower-history-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page enterprise-page">
      <PageHero
        Icon={History}
        kicker="Audit"
        title="History"
        subtitle="Telemetry samples and command events for compliance review"
        actions={
          <button
            type="button"
            className="btn btn--primary"
            onClick={onExport}
            disabled={filtered.length === 0}
          >
            <Download aria-hidden size={15} strokeWidth={2} />
            Export CSV
          </button>
        }
      />

      <div className="stat-strip">
        <article className="stat-chip">
          <span className="stat-chip__label">Samples</span>
          <strong>{filtered.length}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Average load</span>
          <strong>{avgLoad == null ? "—" : `${avgLoad.toFixed(0)}%`}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Average battery</span>
          <strong>{avgBattery == null ? "—" : `${avgBattery.toFixed(0)}%`}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Command events</span>
          <strong>{events.length}</strong>
        </article>
      </div>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="panel__head">
          <h2>
            <LineChart aria-hidden size={16} strokeWidth={2} /> Date range
          </h2>
        </div>
        <div className="form-panel form-panel--inline" style={{ maxWidth: "none", border: "none", padding: 0, boxShadow: "none" }}>
          <label className="field">
            <span>From date</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            <span>To date</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </section>

      <div className="enterprise-grid">
        <section className="panel panel--wide">
          <div className="panel__head">
            <h2>
              <LineChart aria-hidden size={16} strokeWidth={2} /> Telemetry samples
            </h2>
            <span className="panel__tag">Showing up to 100 newest</span>
          </div>
          {filtered.length === 0 ? (
            <p className="panel__empty">
              No samples in this range. Keep Overview or Device open to collect live metrics.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Mode</th>
                    <th>Output load %</th>
                    <th>Battery capacity %</th>
                    <th>Voltage in</th>
                    <th>Voltage out</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .slice()
                    .reverse()
                    .slice(0, 100)
                    .map((s) => (
                      <tr key={s.at}>
                        <td>{new Date(s.at).toLocaleString()}</td>
                        <td>{s.connected ? s.mode : "offline"}</td>
                        <td>{s.loadPercent.toFixed(0)}</td>
                        <td>{s.batteryPercent.toFixed(0)}</td>
                        <td>{s.inputVoltage.toFixed(1)} V</td>
                        <td>{s.outputVoltage.toFixed(1)} V</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>
              <ScrollText aria-hidden size={16} strokeWidth={2} /> Command events
            </h2>
          </div>
          {events.length === 0 ? (
            <p className="panel__empty">No command events yet.</p>
          ) : (
            <ul className="data-list">
              {events.slice(0, 20).map((e) => (
                <li key={e.id} className="data-row">
                  <div>
                    <strong>{controlCommandLabel(e.command as ControlCommand)}</strong>
                    <div className="muted">{e.message}</div>
                    <div className="muted tiny">{new Date(e.at).toLocaleString()}</div>
                  </div>
                  <span className={e.ok ? "chip chip--ok" : "chip chip--danger"}>
                    {e.ok ? "Succeeded" : "Failed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
