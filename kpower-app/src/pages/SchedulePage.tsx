import { useMemo, useState, type FormEvent } from "react";
import { CalendarClock, CalendarPlus, Power, Trash2 } from "lucide-react";
import { PageHero } from "../components/PageHero";
import {
  loadSchedules,
  newId,
  saveSchedules,
  scheduleActionLabel,
  type ScheduleAction,
  type ScheduleItem,
} from "../lib/appData";

const ACTIONS: ScheduleAction[] = ["selfTest", "buzzerMute", "shutdownOs", "upsOff"];

function defaultRunAt(): string {
  const d = new Date(Date.now() + 3_600_000);
  d.setSeconds(0, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>(() => loadSchedules());
  const [label, setLabel] = useState("Weekly self-test");
  const [action, setAction] = useState<ScheduleAction>("selfTest");
  const [runAt, setRunAt] = useState(defaultRunAt);

  const persist = (next: ScheduleItem[]) => {
    setItems(next);
    saveSchedules(next);
  };

  const enabledCount = useMemo(() => items.filter((i) => i.enabled).length, [items]);
  const nextRun = useMemo(() => {
    const upcoming = items
      .filter((i) => i.enabled)
      .sort((a, b) => a.runAt.localeCompare(b.runAt))[0];
    return upcoming ? new Date(upcoming.runAt).toLocaleString() : "None scheduled";
  }, [items]);

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !runAt) return;
    const item: ScheduleItem = {
      id: newId("sch"),
      label: label.trim(),
      action,
      runAt,
      enabled: true,
    };
    persist([item, ...items]);
    setLabel("");
  };

  const toggle = (id: string) => {
    persist(items.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)));
  };

  const remove = (id: string) => {
    persist(items.filter((i) => i.id !== id));
  };

  return (
    <section className="page enterprise-page">
      <PageHero
        Icon={CalendarClock}
        kicker="Automation"
        title="Schedule"
        subtitle="Timed UPS actions for maintenance windows and protective shutdowns"
      />

      <div className="stat-strip">
        <article className="stat-chip">
          <span className="stat-chip__label">Total jobs</span>
          <strong>{items.length}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Enabled</span>
          <strong>{enabledCount}</strong>
        </article>
        <article className="stat-chip stat-chip--wide">
          <span className="stat-chip__label">Next run</span>
          <strong className="stat-chip__text">{nextRun}</strong>
        </article>
      </div>

      <div className="enterprise-grid enterprise-grid--schedule">
        <section className="panel">
          <div className="panel__head">
            <h2>
              <CalendarPlus aria-hidden size={16} strokeWidth={2} /> Create schedule
            </h2>
          </div>
          <form className="form-stack" onSubmit={onAdd}>
            <label className="field">
              <span>Display name</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} required />
            </label>
            <label className="field">
              <span>Action</span>
              <select value={action} onChange={(e) => setAction(e.target.value as ScheduleAction)}>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {scheduleActionLabel(a)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Run at</span>
              <input type="datetime-local" value={runAt} onChange={(e) => setRunAt(e.target.value)} required />
            </label>
            <button type="submit" className="btn btn--primary">
              <CalendarPlus aria-hidden size={15} strokeWidth={2} />
              Add schedule
            </button>
            <p className="muted tiny">
              Execution against the UPS hardware arrives with the HID protocol adapter.
            </p>
          </form>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>
              <CalendarClock aria-hidden size={16} strokeWidth={2} /> Upcoming jobs
            </h2>
            <span className="panel__tag">{items.length} total</span>
          </div>
          {items.length === 0 ? (
            <p className="panel__empty">No schedules yet. Create one to automate UPS maintenance.</p>
          ) : (
            <ul className="data-list">
              {items
                .slice()
                .sort((a, b) => a.runAt.localeCompare(b.runAt))
                .map((item) => (
                  <li key={item.id} className="data-row">
                    <div>
                      <strong>{item.label}</strong>
                      <div className="muted">
                        {scheduleActionLabel(item.action)} · {new Date(item.runAt).toLocaleString()}
                      </div>
                      <div className="muted tiny">{item.enabled ? "Enabled" : "Disabled"}</div>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="btn btn--secondary" onClick={() => toggle(item.id)}>
                        <Power aria-hidden size={15} strokeWidth={2} />
                        {item.enabled ? "Disable" : "Enable"}
                      </button>
                      <button type="button" className="btn btn--danger" onClick={() => remove(item.id)}>
                        <Trash2 aria-hidden size={15} strokeWidth={2} />
                        Delete
                      </button>
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
