import { useMemo, useState } from "react";
import { Bell, BellRing, CheckCircle2, ShieldAlert, Trash2 } from "lucide-react";
import { PageHero } from "../components/PageHero";
import type { AlarmRecord } from "../lib/appData";
import { loadAlarms, saveAlarms } from "../lib/appData";
import type { UpsSnapshot } from "../lib/types";

function severityClass(severity: AlarmRecord["severity"]): string {
  if (severity === "critical") return "chip chip--danger";
  if (severity === "warning") return "chip chip--warn";
  return "chip chip--info";
}

function severityLabel(severity: AlarmRecord["severity"]): string {
  if (severity === "critical") return "Critical";
  if (severity === "warning") return "Warning";
  return "Information";
}

export function AlarmsPage({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const [alarms, setAlarms] = useState<AlarmRecord[]>(() => loadAlarms());

  const persist = (next: AlarmRecord[]) => {
    setAlarms(next);
    saveAlarms(next);
  };

  const active = useMemo(() => alarms.filter((a) => a.active), [alarms]);
  const criticalCount = active.filter((a) => a.severity === "critical").length;
  const warningCount = active.filter((a) => a.severity === "warning").length;
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
    <section className="page enterprise-page">
      <PageHero
        Icon={Bell}
        kicker="Events"
        title="Alarms"
        subtitle="Active conditions and recent alarm history for this UPS"
        actions={
          <button type="button" className="btn btn--secondary" onClick={injectDemo}>
            <BellRing aria-hidden size={15} strokeWidth={2} />
            Simulate alarm
          </button>
        }
      />

      <div className="stat-strip">
        <article className="stat-chip">
          <span className="stat-chip__label">Active</span>
          <strong>{active.length}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Critical</span>
          <strong className={criticalCount ? "text-danger" : ""}>{criticalCount}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Warning</span>
          <strong className={warningCount ? "is-warn-text" : ""}>{warningCount}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Live codes</span>
          <strong>{liveCodes.length || "None"}</strong>
        </article>
      </div>

      {liveCodes.length > 0 ? (
        <p className="banner banner--warn">
          Live codes from UPS: {liveCodes.join(", ")}
        </p>
      ) : null}

      <div className="enterprise-grid">
        <section className="panel">
          <div className="panel__head">
            <h2>
              <ShieldAlert aria-hidden size={16} strokeWidth={2} /> Active alarms
            </h2>
            <span className="panel__tag">{active.length} open</span>
          </div>
          {active.length === 0 ? (
            <p className="panel__empty">No active alarms. System condition is clear.</p>
          ) : (
            <ul className="data-list">
              {active.map((a) => (
                <li key={a.id} className="data-row">
                  <div>
                    <span className={severityClass(a.severity)}>{severityLabel(a.severity)}</span>{" "}
                    <strong>{a.code}</strong>
                    <div className="muted">{a.message}</div>
                    <div className="muted tiny">{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="row-actions">
                    {!a.acked ? (
                      <button type="button" className="btn btn--secondary" onClick={() => acknowledge(a.id)}>
                        <CheckCircle2 aria-hidden size={15} strokeWidth={2} />
                        Acknowledge
                      </button>
                    ) : null}
                    <button type="button" className="btn" onClick={() => clear(a.id)}>
                      <Trash2 aria-hidden size={15} strokeWidth={2} />
                      Clear
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>
              <Bell aria-hidden size={16} strokeWidth={2} /> Recent history
            </h2>
            <span className="panel__tag">Last 20 cleared</span>
          </div>
          {recent.length === 0 ? (
            <p className="panel__empty">No recent alarms recorded.</p>
          ) : (
            <ul className="data-list">
              {recent.map((a) => (
                <li key={a.id} className="data-row">
                  <div>
                    <span className={severityClass(a.severity)}>{severityLabel(a.severity)}</span>{" "}
                    <strong>{a.code}</strong>
                    <div className="muted">{a.message}</div>
                    <div className="muted tiny">
                      {new Date(a.createdAt).toLocaleString()}
                      {a.acked ? " · acknowledged" : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
