import { useMemo, useState } from "react";
import type { AlarmRecord } from "../lib/appData";
import { loadAlarms, saveAlarms } from "../lib/appData";
import type { UpsSnapshot } from "../lib/types";

function severityClass(severity: AlarmRecord["severity"]): string {
  if (severity === "critical") return "chip chip--danger";
  if (severity === "warning") return "chip chip--warn";
  return "chip chip--info";
}

export function AlarmsPage({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const [alarms, setAlarms] = useState<AlarmRecord[]>(() => loadAlarms());

  const persist = (next: AlarmRecord[]) => {
    setAlarms(next);
    saveAlarms(next);
  };

  const active = useMemo(() => alarms.filter((a) => a.active), [alarms]);
  const recent = useMemo(
    () =>
      [...alarms]
        .filter((a) => !a.active)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20),
    [alarms],
  );

  const liveCodes = snapshot?.alarmCodes ?? [];

  const acknowledge = (id: string) => {
    persist(alarms.map((a) => (a.id === id ? { ...a, acked: true } : a)));
  };

  const clear = (id: string) => {
    persist(
      alarms.map((a) =>
        a.id === id
          ? { ...a, active: false, acked: true, clearedAt: Date.now() }
          : a,
      ),
    );
  };

  const injectDemo = () => {
    const demo: AlarmRecord = {
      id: `a-${Date.now()}`,
      code: "OVERLOAD",
      message: "Output load exceeded rated capacity",
      severity: "critical",
      active: true,
      acked: false,
      createdAt: Date.now(),
    };
    persist([demo, ...alarms]);
  };

  return (
    <section className="page">
      <div className="page-head">
        <h1>Alarms</h1>
        <button type="button" className="btn btn--secondary" onClick={injectDemo}>
          Simulate alarm
        </button>
      </div>

      {liveCodes.length > 0 ? (
        <p className="banner banner--warn">
          Live codes from UPS: {liveCodes.join(", ")}
        </p>
      ) : null}

      <h2 className="section-title">Active</h2>
      {active.length === 0 ? (
        <p className="muted">No active alarms.</p>
      ) : (
        <ul className="data-list">
          {active.map((a) => (
            <li key={a.id} className="data-row">
              <div>
                <span className={severityClass(a.severity)}>{a.severity}</span>{" "}
                <strong>{a.code}</strong>
                <div className="muted">{a.message}</div>
                <div className="muted tiny">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <div className="row-actions">
                {!a.acked ? (
                  <button type="button" className="btn btn--secondary" onClick={() => acknowledge(a.id)}>
                    Acknowledge
                  </button>
                ) : null}
                <button type="button" className="btn" onClick={() => clear(a.id)}>
                  Clear
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">Recent</h2>
      {recent.length === 0 ? (
        <p className="muted">No recent alarms.</p>
      ) : (
        <ul className="data-list">
          {recent.map((a) => (
            <li key={a.id} className="data-row">
              <div>
                <span className={severityClass(a.severity)}>{a.severity}</span>{" "}
                <strong>{a.code}</strong>
                <div className="muted">{a.message}</div>
                <div className="muted tiny">
                  {new Date(a.createdAt).toLocaleString()}
                  {a.acked ? " · acked" : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
