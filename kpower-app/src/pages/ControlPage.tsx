import { useState } from "react";
import { CheckCircle2, Send, Zap } from "lucide-react";
import { PageHero } from "../components/PageHero";
import {
  controlCommandLabel,
  isDestructive,
  loadCommandResults,
  runSimulatedCommand,
  saveCommandResults,
  type CommandResult,
  type ControlCommand,
} from "../lib/appData";
import type { UpsSnapshot } from "../lib/types";

type ControlOption = {
  id: ControlCommand;
  needsMinutes?: { min: number; max: number; defaultValue: number; unitLabel: string };
};

const OPTIONS: ControlOption[] = [
  { id: "selfTest10s" },
  { id: "selfTestEod" },
  {
    id: "selfTestMinutes",
    needsMinutes: { min: 1, max: 99, defaultValue: 10, unitLabel: "minute(s)" },
  },
  { id: "selfTestCancel" },
  {
    id: "closeOutputMinutes",
    needsMinutes: { min: 0, max: 9, defaultValue: 1, unitLabel: "minute(s)" },
  },
  { id: "closeOutputCancel" },
  { id: "buzzerToggle" },
];

export function ControlPage({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const [selected, setSelected] = useState<ControlCommand>("selfTest10s");
  const [selfTestMinutes, setSelfTestMinutes] = useState(10);
  const [closeOutputMinutes, setCloseOutputMinutes] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [results, setResults] = useState<CommandResult[]>(() => loadCommandResults());
  const [flash, setFlash] = useState<string | null>(null);

  const connected = Boolean(snapshot?.connected);
  const persist = (next: CommandResult[]) => {
    setResults(next);
    saveCommandResults(next);
  };

  const detailFor = (cmd: ControlCommand): string | undefined => {
    if (cmd === "selfTestMinutes") return `${selfTestMinutes} minute(s)`;
    if (cmd === "closeOutputMinutes") return `${closeOutputMinutes} minute(s)`;
    return undefined;
  };

  const send = (cmd: ControlCommand) => {
    const result = runSimulatedCommand(cmd, connected, detailFor(cmd));
    persist([result, ...results].slice(0, 200));
    setFlash(result.message);
    setConfirmOpen(false);
  };

  const onSure = () => {
    if (selected === "selfTestMinutes") {
      const n = Math.min(99, Math.max(1, selfTestMinutes));
      setSelfTestMinutes(n);
    }
    if (selected === "closeOutputMinutes") {
      const n = Math.min(9, Math.max(0, closeOutputMinutes));
      setCloseOutputMinutes(n);
    }
    if (isDestructive(selected)) {
      setConfirmOpen(true);
      return;
    }
    send(selected);
  };

  return (
    <section className="page enterprise-page">
      <PageHero
        Icon={Zap}
        kicker="Operations"
        title="UPS Control"
        subtitle="Self-test, output close, and buzzer commands matching stock KPower"
      />

      <div className="stat-strip stat-strip--four">
        <article className="stat-chip">
          <span className="stat-chip__label">Link</span>
          <strong className={connected ? "is-ok-text" : "text-danger"}>
            {connected ? "Connected" : "Disconnected"}
          </strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Selected</span>
          <strong className="stat-chip__text">{controlCommandLabel(selected)}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Succeeded</span>
          <strong>{results.filter((r) => r.ok).length}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Failed</span>
          <strong className={results.some((r) => !r.ok) ? "text-danger" : ""}>
            {results.filter((r) => !r.ok).length}
          </strong>
        </article>
      </div>

      {!connected ? (
        <p className="banner banner--warn">
          UPS not connected — commands will fail until the device is online.
        </p>
      ) : null}

      <div className="enterprise-grid">
        <section className="panel">
          <div className="panel__head">
            <h2>UPS Control</h2>
          </div>
          <div className="control-options">
            {OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={selected === opt.id ? "control-option control-option--active" : "control-option"}
              >
                <input
                  type="radio"
                  name="ups-control"
                  checked={selected === opt.id}
                  onChange={() => setSelected(opt.id)}
                />
                <span className="control-option__body">
                  <strong>{controlCommandLabel(opt.id)}</strong>
                  {opt.needsMinutes ? (
                    <span className="control-option__param">
                      Duration ({opt.needsMinutes.min} to {opt.needsMinutes.max}){" "}
                      <input
                        type="number"
                        min={opt.needsMinutes.min}
                        max={opt.needsMinutes.max}
                        value={
                          opt.id === "selfTestMinutes" ? selfTestMinutes : closeOutputMinutes
                        }
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (opt.id === "selfTestMinutes") setSelfTestMinutes(n);
                          else setCloseOutputMinutes(n);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={
                          opt.id === "selfTestMinutes"
                            ? "Self-test duration in minutes"
                            : "Close output delay in minutes"
                        }
                      />{" "}
                      {opt.needsMinutes.unitLabel}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          <div className="row-actions" style={{ marginTop: "1.1rem", justifyContent: "center" }}>
            <button type="button" className="btn btn--primary btn--wide" onClick={onSure}>
              <Send aria-hidden size={15} strokeWidth={2} />
              Sure
            </button>
            {flash ? <p className="flash">{flash}</p> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>
              <CheckCircle2 aria-hidden size={16} strokeWidth={2} /> Recent results
            </h2>
          </div>
          {results.length === 0 ? (
            <p className="panel__empty">No commands sent yet.</p>
          ) : (
            <ul className="data-list">
              {results.slice(0, 12).map((r) => (
                <li key={r.id} className="data-row">
                  <div>
                    <strong>{controlCommandLabel(r.command)}</strong>
                    <div className={r.ok ? "muted" : "text-danger"}>{r.message}</div>
                    <div className="muted tiny">{new Date(r.at).toLocaleString()}</div>
                  </div>
                  <span className={r.ok ? "chip chip--ok" : "chip chip--danger"}>
                    {r.ok ? "Succeeded" : "Failed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {confirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-labelledby="confirm-title">
            <h2 id="confirm-title">Confirm {controlCommandLabel(selected)}</h2>
            <p>
              {selected === "closeOutputMinutes"
                ? `UPS output will close in ${closeOutputMinutes} minute(s). Protected loads may lose power.`
                : "Self-test to end of discharge can deeply discharge the battery."}
            </p>
            <div className="row-actions">
              <button type="button" className="btn btn--secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" onClick={() => send(selected)}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
