import { useState, type FormEvent } from "react";
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
    <section className="page">
      <h1>Schedule</h1>
      <p className="muted">Timed UPS actions. Execution against HID arrives with the protocol adapter.</p>

      <form className="form-panel" onSubmit={onAdd}>
        <label className="field">
          <span>Label</span>
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
          Add schedule
        </button>
      </form>

      <h2 className="section-title">Upcoming</h2>
      {items.length === 0 ? (
        <p className="muted">No schedules yet.</p>
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
                    {item.enabled ? "" : " · disabled"}
                  </div>
                </div>
                <div className="row-actions">
                  <button type="button" className="btn btn--secondary" onClick={() => toggle(item.id)}>
                    {item.enabled ? "Disable" : "Enable"}
                  </button>
                  <button type="button" className="btn btn--danger" onClick={() => remove(item.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
