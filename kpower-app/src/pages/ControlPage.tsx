import { useState } from "react";
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

const COMMANDS: ControlCommand[] = [
  "selfTest",
  "buzzerOn",
  "buzzerOff",
  "upsOn",
  "upsOff",
];

export function ControlPage({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const [selected, setSelected] = useState<ControlCommand>("selfTest");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [results, setResults] = useState<CommandResult[]>(() => loadCommandResults());
  const [flash, setFlash] = useState<string | null>(null);

  const connected = Boolean(snapshot?.connected);

  const persist = (next: CommandResult[]) => {
    setResults(next);
    saveCommandResults(next);
  };

  const send = (cmd: ControlCommand) => {
    const result = runSimulatedCommand(cmd, connected);
    persist([result, ...results].slice(0, 200));
    setFlash(result.message);
    setConfirmOpen(false);
  };

  const onSubmit = () => {
    if (isDestructive(selected)) {
      setConfirmOpen(true);
      return;
    }
    send(selected);
  };

  return (
    <section className="page">
      <h1>Control</h1>
      <p className="muted">
        Send UPS commands. Destructive actions require confirmation. Simulator replies until HID is connected.
      </p>

      {!connected ? (
        <p className="banner banner--warn">UPS not connected — most commands will fail until reconnect.</p>
      ) : null}

      <div className="form-panel">
        <fieldset className="choice-set">
          <legend>Command</legend>
          {COMMANDS.map((cmd) => (
            <label key={cmd} className="choice">
              <input
                type="radio"
                name="ups-cmd"
                checked={selected === cmd}
                onChange={() => setSelected(cmd)}
              />
              <span>
                {controlCommandLabel(cmd)}
                {isDestructive(cmd) ? " (destructive)" : ""}
              </span>
            </label>
          ))}
        </fieldset>
        <button type="button" className="btn btn--primary" onClick={onSubmit}>
          Send command
        </button>
        {flash ? <p className="flash">{flash}</p> : null}
      </div>

      {confirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-labelledby="confirm-title">
            <h2 id="confirm-title">Confirm UPS power off</h2>
            <p>This will request a UPS power-off. Connected loads may lose power.</p>
            <div className="row-actions">
              <button type="button" className="btn btn--secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" onClick={() => send("upsOff")}>
                Power off UPS
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <h2 className="section-title">Recent results</h2>
      {results.length === 0 ? (
        <p className="muted">No commands sent yet.</p>
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
                {r.ok ? "ok" : "failed"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
