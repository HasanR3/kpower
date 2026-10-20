import { useState, type FormEvent } from "react";
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
    <section className="page">
      <h1>Settings</h1>
      <p className="muted">Preferences persist in this browser profile until the native SQLite backend ships.</p>

      <form className="form-panel" onSubmit={onSave}>
        <label className="field">
          <span>Poll interval (ms)</span>
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
          <span>Communication</span>
          <select
            value={settings.commsType}
            onChange={(e) => update("commsType", e.target.value as AppSettings["commsType"])}
          >
            <option value="usb">USB HID</option>
            <option value="serial">Serial</option>
          </select>
        </label>

        <label className="field">
          <span>Shutdown when battery ≤ %</span>
          <input
            type="number"
            min={1}
            max={50}
            value={settings.shutdownBatteryPercent}
            onChange={(e) => update("shutdownBatteryPercent", Number(e.target.value))}
          />
        </label>

        <label className="field">
          <span>Shutdown when runtime ≤ seconds</span>
          <input
            type="number"
            min={30}
            max={3600}
            value={settings.shutdownRuntimeSeconds}
            onChange={(e) => update("shutdownRuntimeSeconds", Number(e.target.value))}
          />
        </label>

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
          <span>Minimize to tray</span>
        </label>

        <label className="choice">
          <input
            type="checkbox"
            checked={settings.simulateAlarms}
            onChange={(e) => update("simulateAlarms", e.target.checked)}
          />
          <span>Allow simulated alarm injection</span>
        </label>

        <div className="row-actions">
          <button type="submit" className="btn btn--primary">
            Save settings
          </button>
          <button type="button" className="btn btn--secondary" onClick={onReset}>
            Reset defaults
          </button>
        </div>
        {saved ? <p className="flash">Settings saved.</p> : null}
      </form>

      <h2 className="section-title">Simulator</h2>
      <div className="row-actions">
        <button type="button" className="btn btn--secondary" onClick={() => simulatorSetConnected(true)}>
          Connect UPS
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => simulatorSetConnected(false)}>
          Disconnect UPS
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => simulatorSetMode("battery")}>
          Battery mode
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => simulatorSetMode("line")}>
          Line mode
        </button>
      </div>
    </section>
  );
}
