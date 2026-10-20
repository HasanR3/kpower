import { useEffect, useMemo, useState } from "react";
import {
  exportHistoryCsv,
  loadCommandResults,
  loadHistory,
  type CommandResult,
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

  useEffect(() => {
    const id = setInterval(() => {
      setSamples(loadHistory());
      setEvents(loadCommandResults());
    }, 2000);
    return () => clearInterval(id);
  }, []);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const filtered = useMemo(() => {
    const fromTs = startOfDay(new Date(from).getTime());
    const toTs = startOfDay(new Date(to).getTime()) + 86_400_000;
    return samples.filter((s) => s.at >= fromTs && s.at < toTs);
  }, [samples, from, to]);

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
    <section className="page">
      <div className="page-head">
        <h1>History</h1>
        <button type="button" className="btn btn--primary" onClick={onExport} disabled={filtered.length === 0}>
          Export CSV
        </button>
      </div>

      <div className="form-panel form-panel--inline">
        <label className="field">
          <span>From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <h2 className="section-title">Metrics ({filtered.length})</h2>
      {filtered.length === 0 ? (
        <p className="muted">No samples in this range. Leave Device open to collect live metrics.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Mode</th>
                <th>Load %</th>
                <th>Battery %</th>
                <th>Vin</th>
                <th>Vout</th>
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
                    <td>{s.inputVoltage.toFixed(1)}</td>
                    <td>{s.outputVoltage.toFixed(1)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section-title">Command events</h2>
      {events.length === 0 ? (
        <p className="muted">No command events yet.</p>
      ) : (
        <ul className="data-list">
          {events.slice(0, 20).map((e) => (
            <li key={e.id} className="data-row">
              <div>
                <strong>{e.command}</strong>
                <div className="muted">{e.message}</div>
              </div>
              <span className="muted tiny">{new Date(e.at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
