import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Radio,
  Send,
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

type ControlOption = {
  id: ControlCommand;
  hint: string;
  needsMinutes?: { min: number; max: number; unit: string };
};

type ControlGroup = {
  id: string;
  title: string;
  options: ControlOption[];
};

const GROUPS: ControlGroup[] = [
  {
    id: "self-test",
    title: "Self-test",
    options: [
      {
        id: "selfTest10s",
        hint: "Quick battery and inverter check",
      },
      {
        id: "selfTestEod",
        hint: "Runs until discharge threshold — use with care",
      },
      {
        id: "selfTestMinutes",
        hint: "Timed self-test for a set duration",
        needsMinutes: { min: 1, max: 99, unit: "min" },
      },
      {
        id: "selfTestCancel",
        hint: "Stop an in-progress self-test",
      },
    ],
  },
  {
    id: "output",
    title: "Protected output",
    options: [
      {
        id: "closeOutputMinutes",
        hint: "Delay, then cut UPS output to the load",
        needsMinutes: { min: 0, max: 9, unit: "min" },
      },
      {
        id: "closeOutputCancel",
        hint: "Cancel a pending output close",
      },
    ],
  },
  {
    id: "alerts",
    title: "Alerts",
    options: [
      {
        id: "buzzerToggle",
        hint: "Mute or unmute the UPS buzzer",
      },
    ],
  },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function ControlPage({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const [selected, setSelected] = useState<ControlCommand>("selfTest10s");
  const [selfTestMinutes, setSelfTestMinutes] = useState(10);
  const [closeOutputMinutes, setCloseOutputMinutes] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [results, setResults] = useState<CommandResult[]>(() => loadCommandResults());
  const [flash, setFlash] = useState<string | null>(null);

  const connected = Boolean(snapshot?.connected);
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const selectedMeta = GROUPS.flatMap((g) => g.options).find((o) => o.id === selected);

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

  const onSend = () => {
    if (selected === "selfTestMinutes") {
      setSelfTestMinutes((n) => clamp(n, 1, 99));
    }
    if (selected === "closeOutputMinutes") {
      setCloseOutputMinutes((n) => clamp(n, 0, 9));
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
        subtitle="Issue self-test, output, and buzzer commands with confirmation on destructive actions"
      />

      <div className="ops-bar" role="status">
        <div className="ops-bar__item">
          <span className="ops-bar__label">Link</span>
          <strong className={connected ? "is-ok-text" : "text-danger"}>
            {connected ? "Connected" : "Disconnected"}
          </strong>
        </div>
        <div className="ops-bar__item ops-bar__item--grow">
          <span className="ops-bar__label">Selected</span>
          <strong className="ops-bar__selected">{controlCommandLabel(selected)}</strong>
        </div>
        <div className="ops-bar__item">
          <span className="ops-bar__label">Succeeded</span>
          <strong>{succeeded}</strong>
        </div>
        <div className="ops-bar__item">
          <span className="ops-bar__label">Failed</span>
          <strong className={failed > 0 ? "text-danger" : undefined}>{failed}</strong>
        </div>
      </div>

      {!connected ? (
        <p className="banner banner--warn">
          UPS not connected — commands will fail until the device is online.
        </p>
      ) : null}

      <div className="control-layout">
        <section className="panel control-panel">
          <div className="panel__head">
            <h2>
              <Radio aria-hidden size={16} strokeWidth={2} /> Command
            </h2>
            <span className="panel__tag">Stock protocol parity</span>
          </div>

          <div className="cmd-groups">
            {GROUPS.map((group) => (
              <fieldset key={group.id} className="cmd-group">
                <legend className="cmd-group__title">{group.title}</legend>
                <div className="cmd-list" role="radiogroup" aria-label={group.title}>
                  {group.options.map((opt) => {
                    const active = selected === opt.id;
                    const minutesValue =
                      opt.id === "selfTestMinutes" ? selfTestMinutes : closeOutputMinutes;
                    const setMinutes =
                      opt.id === "selfTestMinutes" ? setSelfTestMinutes : setCloseOutputMinutes;

                    return (
                      <label
                        key={opt.id}
                        className={active ? "cmd-row cmd-row--active" : "cmd-row"}
                      >
                        <input
                          type="radio"
                          name="ups-control"
                          value={opt.id}
                          checked={active}
                          onChange={() => setSelected(opt.id)}
                          aria-label={controlCommandLabel(opt.id)}
                        />
                        <span className="cmd-row__main">
                          <strong>{controlCommandLabel(opt.id)}</strong>
                          <span className="cmd-row__hint">{opt.hint}</span>
                        </span>
                        {opt.needsMinutes ? (
                          <span
                            className={
                              active
                                ? "cmd-param"
                                : "cmd-param cmd-param--dim"
                            }
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="number"
                              className="input-compact"
                              min={opt.needsMinutes.min}
                              max={opt.needsMinutes.max}
                              value={minutesValue}
                              disabled={!active}
                              onChange={(e) => setMinutes(Number(e.target.value))}
                              onFocus={() => setSelected(opt.id)}
                              aria-label={
                                opt.id === "selfTestMinutes"
                                  ? "Self-test duration in minutes"
                                  : "Close output delay in minutes"
                              }
                            />
                            <span className="cmd-param__unit">{opt.needsMinutes.unit}</span>
                            <span className="cmd-param__range">
                              {opt.needsMinutes.min}–{opt.needsMinutes.max}
                            </span>
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="control-footer">
            <div className="control-footer__meta">
              {isDestructive(selected) ? (
                <span className="control-footer__warn">
                  <AlertTriangle aria-hidden size={14} strokeWidth={2} />
                  Confirmation required
                </span>
              ) : (
                <span className="muted tiny">
                  {selectedMeta?.hint ?? "Select a command to send"}
                </span>
              )}
              {flash ? <p className="flash">{flash}</p> : null}
            </div>
            <button type="button" className="btn btn--primary" onClick={onSend}>
              <Send aria-hidden size={15} strokeWidth={2} />
              Send command
            </button>
          </div>
        </section>

        <section className="panel control-results">
          <div className="panel__head">
            <h2>
              <CheckCircle2 aria-hidden size={16} strokeWidth={2} /> Recent results
            </h2>
            {results.length > 0 ? (
              <span className="panel__tag">{Math.min(results.length, 12)} shown</span>
            ) : null}
          </div>

          {results.length === 0 ? (
            <div className="empty-state">
              <Clock3 aria-hidden size={28} strokeWidth={1.6} />
              <strong>No commands sent yet</strong>
              <p>Results appear here after you send a UPS control command.</p>
            </div>
          ) : (
            <ul className="result-list">
              {results.slice(0, 12).map((r) => (
                <li key={r.id} className="result-row">
                  <div className="result-row__body">
                    <strong>{controlCommandLabel(r.command)}</strong>
                    <p className={r.ok ? "muted" : "text-danger"}>{r.message}</p>
                    <time className="muted tiny" dateTime={new Date(r.at).toISOString()}>
                      {new Date(r.at).toLocaleString()}
                    </time>
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
