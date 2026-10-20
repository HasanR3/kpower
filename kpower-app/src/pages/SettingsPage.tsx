import { useState, type FormEvent } from "react";
import {
  BatteryCharging,
  Cable,
  FlaskConical,
  Save,
  Settings,
  Shield,
  Unplug,
  Zap,
} from "lucide-react";
import { PageHero } from "../components/PageHero";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "../lib/appData";
import { applySettingsRuntime, simulatorSetConnected, simulatorSetMode } from "../lib/upsStore";

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    applySettingsRuntime(settings);
    setSaved(true);
  };

  const onReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setSaved(false);
  };

  return (
    <section className="page enterprise-page">
      <PageHero
        Icon={Settings}
        kicker="Configuration"
        title="Settings"
        subtitle="Polling, communication, shutdown policy, and workstation behavior"
      />

      <div className="stat-strip">
        <article className="stat-chip">
          <span className="stat-chip__label">Poll interval</span>
          <strong>{settings.pollIntervalMs} ms</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Communication</span>
          <strong>{settings.commsType === "usb" ? "USB HID" : "Serial"}</strong>
        </article>
        <article className="stat-chip">
          <span className="stat-chip__label">Battery policy</span>
          <strong>≤ {settings.shutdownBatteryPercent}%</strong>
        </article>
      </div>

      <form onSubmit={onSave}>
        <div className="enterprise-grid">
          <section className="panel">
            <div className="panel__head">
              <h2>
                <Cable aria-hidden size={16} strokeWidth={2} /> Connectivity
              </h2>
            </div>
            <div className="form-stack">
              <label className="field">
                <span>Poll interval (milliseconds)</span>
                <input
                  type="number"
                  min={500}
                  max={10000}
                  step={100}
                  value={settings.pollIntervalMs}
                  onChange={(e) => update("pollIntervalMs", Number(e.target.value))}
                />
              </label>
              <label className="field">
                <span>Language</span>
                <select
                  value={settings.language}
                  onChange={(e) => update("language", e.target.value as AppSettings["language"])}
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </label>
              <label className="field">
                <span>Communication type</span>
                <select
                  value={settings.commsType}
                  onChange={(e) => update("commsType", e.target.value as AppSettings["commsType"])}
                >
                  <option value="usb">USB HID</option>
                  <option value="serial">Serial</option>
                </select>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>
                <Shield aria-hidden size={16} strokeWidth={2} /> Protective shutdown
              </h2>
            </div>
            <div className="form-stack">
              <label className="field">
                <span>Shutdown when battery capacity is at or below (%)</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.shutdownBatteryPercent}
                  onChange={(e) => update("shutdownBatteryPercent", Number(e.target.value))}
                />
              </label>
              <label className="field">
                <span>Shutdown when estimated runtime is at or below (seconds)</span>
                <input
                  type="number"
                  min={30}
                  max={3600}
                  value={settings.shutdownRuntimeSeconds}
                  onChange={(e) => update("shutdownRuntimeSeconds", Number(e.target.value))}
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>
                <Settings aria-hidden size={16} strokeWidth={2} /> Workstation
              </h2>
            </div>
            <div className="form-stack">
              <label className="choice">
                <input
                  type="checkbox"
                  checked={settings.startWithWindows}
                  onChange={(e) => update("startWithWindows", e.target.checked)}
                />
                <span>Start with Windows</span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={settings.minimizeToTray}
                  onChange={(e) => update("minimizeToTray", e.target.checked)}
                />
                <span>Minimize to system tray</span>
              </label>
              <label className="choice">
                <input
                  type="checkbox"
                  checked={settings.simulateAlarms}
                  onChange={(e) => update("simulateAlarms", e.target.checked)}
                />
                <span>Allow simulated alarm injection</span>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>
                <FlaskConical aria-hidden size={16} strokeWidth={2} /> Simulator lab
              </h2>
              <span className="panel__tag">Development</span>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              Drive telemetry states without UPS hardware while HID reverse-engineering is incomplete.
            </p>
            <div className="row-actions">
              <button type="button" className="btn btn--secondary" onClick={() => simulatorSetConnected(true)}>
                <Cable aria-hidden size={15} strokeWidth={2} />
                Connect UPS
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => simulatorSetConnected(false)}>
                <Unplug aria-hidden size={15} strokeWidth={2} />
                Disconnect UPS
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => simulatorSetMode("battery")}>
                <BatteryCharging aria-hidden size={15} strokeWidth={2} />
                Battery mode
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => simulatorSetMode("line")}>
                <Zap aria-hidden size={15} strokeWidth={2} />
                Line mode
              </button>
            </div>
          </section>
        </div>

        <div className="settings-footer">
          <button type="submit" className="btn btn--primary">
            <Save aria-hidden size={15} strokeWidth={2} />
            Save settings
          </button>
          <button type="button" className="btn btn--secondary" onClick={onReset}>
            Reset defaults
          </button>
          {saved ? <p className="flash">Settings saved.</p> : null}
        </div>
      </form>
    </section>
  );
}
