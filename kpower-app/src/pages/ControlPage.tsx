import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Power,
  Send,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
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

const COMMANDS: {
  id: ControlCommand;
  description: string;
  Icon: typeof Zap;
}[] = [
  { id: "selfTest", description: "Run an immediate UPS self-test sequence", Icon: Zap },
  { id: "buzzerOn", description: "Enable audible alarm buzzer", Icon: Volume2 },
  { id: "buzzerOff", description: "Mute audible alarm buzzer", Icon: VolumeX },
  { id: "upsOn", description: "Request UPS output power on", Icon: Power },
  { id: "upsOff", description: "Request UPS output power off — load may drop", Icon: AlertTriangle },
];

export function ControlPage({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const [selected, setSelected] = useState<ControlCommand>("selfTest");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [results, setResults] = useState<CommandResult[]>(() => loadCommandResults());
  const [flash, setFlash] = useState<string | null>(null);

  const connected = Boolean(snapshot?.connected);
  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

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
    <section className="page enterprise-page">
      <PageHero
        Icon={Zap}
        kicker="Operations"
        title="Control"
        subtitle="Issue UPS commands with confirmation on destructive actions"
      />

      <div className="stat-strip">
        <article className="stat-chip">
          <span className="stat-chip__label">Link</span>
          <strong className={connected ? "is-ok-text" : "text-danger"}>
            {connected ? "Online" : "Offline"}
          </strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Succeeded</span>
          <strong>{successCount}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Failed</span>
          <strong className={failCount ? "text-danger" : ""}>{failCount}</strong>
        </article>
      </div>

      {!connected ? (
        <p className="banner banner--warn">
          UPS not connected — most commands will fail until the device is online again.
        </p>
      ) : null}

      <div className="enterprise-grid">
        <section className="panel">
          <div className="panel__head">
            <h2>
              <Send aria-hidden size={16} strokeWidth={2} /> Command palette
            </h2>
          </div>
          <div className="command-grid">
            {COMMANDS.map(({ id, description, Icon }) => (
              <label
                key={id}
                className={selected === id ? "command-card command-card--active" : "command-card"}
              >
                <input
                  type="radio"
                  name="ups-cmd"
                  checked={selected === id}
                  onChange={() => setSelected(id)}
                />
                <Icon aria-hidden size={18} strokeWidth={2} />
                <div>
                  <strong>
                    {controlCommandLabel(id)}
                    {isDestructive(id) ? " · destructive" : ""}
                  </strong>
                  <p>{description}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="row-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn btn--primary" onClick={onSubmit}>
              <Send aria-hidden size={15} strokeWidth={2} />
              Send command
            </button>
            {flash ? <p className="flash">{flash}</p> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>
              <CheckCircle2 aria-hidden size={16} strokeWidth={2} /> Recent results
            </h2>
            <span className="panel__tag">{results.length} logged</span>
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
    </section>
  );
}
