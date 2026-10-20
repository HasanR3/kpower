import { useState, type FormEvent } from "react";
import {
  BatteryCharging,
  Cable,
  FlaskConical,
  Mail,
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

type SettingsSection = "general" | "email" | "shutdown" | "simulator";

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState<SettingsSection>("shutdown");

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => {
      const next = { ...s, [key]: value };
      if (key === "shutdownBatteryPercentAfterAcFault") {
        next.shutdownBatteryPercent = Number(value);
      }
      return next;
    });
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
        subtitle="Common parameters: E-Mail, Shutdown, connectivity, and simulator"
      />

      <div className="settings-shell">
        <aside className="settings-nav panel" aria-label="Settings sections">
          <p className="settings-nav__title">Common parameters</p>
          <button
            type="button"
            className={section === "email" ? "settings-nav__btn is-active" : "settings-nav__btn"}
            onClick={() => setSection("email")}
          >
            <Mail aria-hidden size={15} strokeWidth={2} /> E-Mail
          </button>
          <button
            type="button"
            className={section === "shutdown" ? "settings-nav__btn is-active" : "settings-nav__btn"}
            onClick={() => setSection("shutdown")}
          >
            <Shield aria-hidden size={15} strokeWidth={2} /> Shutdown
          </button>
          <button
            type="button"
            className={section === "general" ? "settings-nav__btn is-active" : "settings-nav__btn"}
            onClick={() => setSection("general")}
          >
            <Cable aria-hidden size={15} strokeWidth={2} /> Connectivity
          </button>
          <button
            type="button"
            className={section === "simulator" ? "settings-nav__btn is-active" : "settings-nav__btn"}
            onClick={() => setSection("simulator")}
          >
            <FlaskConical aria-hidden size={15} strokeWidth={2} /> Simulator lab
          </button>
        </aside>

        <form className="settings-main" onSubmit={onSave}>
          {section === "email" ? (
            <section className="panel settings-card">
              <div className="panel__head">
                <h2>
                  <Mail aria-hidden size={16} strokeWidth={2} /> E-Mail
                </h2>
              </div>
              <div className="form-stack settings-card__body">
                <label className="choice choice--row">
                  <input
                    type="checkbox"
                    checked={settings.emailEnabled}
                    onChange={(e) => update("emailEnabled", e.target.checked)}
                  />
                  <span>Enable e-mail notifications</span>
                </label>
                <label className="field">
                  <span>SMTP host</span>
                  <input
                    value={settings.emailSmtpHost}
                    onChange={(e) => update("emailSmtpHost", e.target.value)}
                    placeholder="smtp.example.com"
                  />
                </label>
                <label className="field">
                  <span>SMTP port</span>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={settings.emailSmtpPort}
                    onChange={(e) => update("emailSmtpPort", Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span>Username</span>
                  <input
                    value={settings.emailUsername}
                    onChange={(e) => update("emailUsername", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={settings.emailPassword}
                    onChange={(e) => update("emailPassword", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>From address</span>
                  <input
                    value={settings.emailFrom}
                    onChange={(e) => update("emailFrom", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>To address</span>
                  <input value={settings.emailTo} onChange={(e) => update("emailTo", e.target.value)} />
                </label>
                <label className="choice choice--row">
                  <input
                    type="checkbox"
                    checked={settings.emailOnAlarm}
                    onChange={(e) => update("emailOnAlarm", e.target.checked)}
                  />
                  <span>Notify on alarm</span>
                </label>
                <label className="choice choice--row">
                  <input
                    type="checkbox"
                    checked={settings.emailOnPowerFail}
                    onChange={(e) => update("emailOnPowerFail", e.target.checked)}
                  />
                  <span>Notify on power fail</span>
                </label>
                <label className="choice choice--row">
                  <input
                    type="checkbox"
                    checked={settings.emailOnLowBattery}
                    onChange={(e) => update("emailOnLowBattery", e.target.checked)}
                  />
                  <span>Notify on low battery</span>
                </label>
              </div>
            </section>
          ) : null}

          {section === "shutdown" ? (
            <div className="settings-stack">
              <section className="panel settings-card">
                <div className="panel__head">
                  <h2>
                    <Shield aria-hidden size={16} strokeWidth={2} /> KPower power control
                  </h2>
                </div>
                <div className="form-stack settings-card__body">
                  <label className="choice choice--row">
                    <input
                      type="checkbox"
                      checked={settings.powerControlEnabled}
                      onChange={(e) => update("powerControlEnabled", e.target.checked)}
                    />
                    <span>KPower power control</span>
                  </label>

                  <fieldset className="nested-fields" disabled={!settings.powerControlEnabled}>
                    <label className="field field--inline">
                      <span>
                        After main AC fault, shutdown system in (0 to 2880) minute(s)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={2880}
                        value={settings.shutdownMinutesAfterAcFault}
                        onChange={(e) => update("shutdownMinutesAfterAcFault", Number(e.target.value))}
                      />
                    </label>
                    <label className="field field--inline">
                      <span>
                        If low battery occurred, shutdown system in (0 to 600) minute(s)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={600}
                        value={settings.shutdownMinutesOnLowBattery}
                        onChange={(e) => update("shutdownMinutesOnLowBattery", Number(e.target.value))}
                      />
                    </label>
                    <label className="field field--inline">
                      <span>
                        After main AC fault, shutdown system when battery capacity lower than (1 to
                        100) %
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={settings.shutdownBatteryPercentAfterAcFault}
                        onChange={(e) =>
                          update("shutdownBatteryPercentAfterAcFault", Number(e.target.value))
                        }
                      />
                    </label>
                    <label className="choice choice--row">
                      <input
                        type="checkbox"
                        checked={settings.shutdownOs}
                        onChange={(e) => update("shutdownOs", e.target.checked)}
                      />
                      <span>Shutdown operating system</span>
                    </label>
                    <label className="choice choice--row">
                      <input
                        type="checkbox"
                        checked={settings.commandFileEnabled}
                        onChange={(e) => update("commandFileEnabled", e.target.checked)}
                      />
                      <span>Command file to execute</span>
                    </label>
                    <label className="field field--browse">
                      <span>Command file</span>
                      <div className="browse-row">
                        <input
                          value={settings.commandFilePath}
                          onChange={(e) => update("commandFilePath", e.target.value)}
                          disabled={!settings.commandFileEnabled}
                          placeholder="C:\\scripts\\pre-shutdown.bat"
                        />
                        <button
                          type="button"
                          className="btn btn--secondary"
                          disabled={!settings.commandFileEnabled}
                          onClick={() => {
                            const path = window.prompt("Command file path", settings.commandFilePath);
                            if (path != null) update("commandFilePath", path);
                          }}
                        >
                          Browse
                        </button>
                      </div>
                    </label>
                    <label className="field field--inline">
                      <span>Maximum execution time (minute(s))</span>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={settings.commandMaxExecutionMinutes}
                        disabled={!settings.commandFileEnabled}
                        onChange={(e) => update("commandMaxExecutionMinutes", Number(e.target.value))}
                      />
                    </label>
                  </fieldset>
                </div>
              </section>

              <section className="panel settings-card">
                <div className="panel__head">
                  <h2>UPS power off</h2>
                </div>
                <div className="form-stack settings-card__body">
                  <label className="choice choice--row">
                    <input
                      type="checkbox"
                      checked={settings.upsPowerOffEnabled}
                      onChange={(e) => update("upsPowerOffEnabled", e.target.checked)}
                    />
                    <span>UPS power off</span>
                  </label>
                  <fieldset className="nested-fields" disabled={!settings.upsPowerOffEnabled}>
                    <label className="field field--inline">
                      <span>Time needed (1 to 9) minute(s) before UPS turns off</span>
                      <input
                        type="number"
                        min={1}
                        max={9}
                        value={settings.upsPowerOffDelayMinutes}
                        onChange={(e) => update("upsPowerOffDelayMinutes", Number(e.target.value))}
                      />
                    </label>
                  </fieldset>
                </div>
              </section>
            </div>
          ) : null}

          {section === "general" ? (
            <section className="panel settings-card">
              <div className="panel__head">
                <h2>
                  <Cable aria-hidden size={16} strokeWidth={2} /> Connectivity & workstation
                </h2>
              </div>
              <div className="form-stack settings-card__body">
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
                    <option value="usb">USB HID device</option>
                    <option value="serial">Serial port</option>
                  </select>
                </label>
                <label className="choice choice--row">
                  <input
                    type="checkbox"
                    checked={settings.startWithWindows}
                    onChange={(e) => update("startWithWindows", e.target.checked)}
                  />
                  <span>Start with Windows</span>
                </label>
                <label className="choice choice--row">
                  <input
                    type="checkbox"
                    checked={settings.minimizeToTray}
                    onChange={(e) => update("minimizeToTray", e.target.checked)}
                  />
                  <span>Minimize to system tray</span>
                </label>
                <label className="choice choice--row">
                  <input
                    type="checkbox"
                    checked={settings.simulateAlarms}
                    onChange={(e) => update("simulateAlarms", e.target.checked)}
                  />
                  <span>Allow simulated alarm injection</span>
                </label>
              </div>
            </section>
          ) : null}

          {section === "simulator" ? (
            <section className="panel settings-card">
              <div className="panel__head">
                <h2>
                  <FlaskConical aria-hidden size={16} strokeWidth={2} /> Simulator lab
                </h2>
                <span className="panel__tag">Development</span>
              </div>
              <div className="settings-card__body">
                <p className="settings-note">
                  Drive telemetry states without UPS hardware while the HID adapter is incomplete.
                </p>
                <div className="sim-actions">
                  <button type="button" className="btn btn--secondary" onClick={() => simulatorSetConnected(true)}>
                    <Cable aria-hidden size={15} strokeWidth={2} /> Connect UPS
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={() => simulatorSetConnected(false)}>
                    <Unplug aria-hidden size={15} strokeWidth={2} /> Disconnect UPS
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={() => simulatorSetMode("battery")}>
                    <BatteryCharging aria-hidden size={15} strokeWidth={2} /> Battery mode
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={() => simulatorSetMode("line")}>
                    <Zap aria-hidden size={15} strokeWidth={2} /> Line mode
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <div className="settings-footer panel">
            <div className="settings-footer__copy">
              <strong>Apply configuration</strong>
              <p className="muted tiny">Persisted locally until native settings storage ships.</p>
            </div>
            <div className="row-actions">
              <button type="submit" className="btn btn--primary">
                <Save aria-hidden size={15} strokeWidth={2} /> Save settings
              </button>
              <button type="button" className="btn btn--secondary" onClick={onReset}>
                Reset defaults
              </button>
              {saved ? <p className="flash">Settings saved.</p> : null}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
