import { useState, type FormEvent, type ReactNode } from "react";
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

type SettingsSection = "email" | "shutdown" | "general" | "simulator";

const TABS: { id: SettingsSection; label: string; Icon: typeof Mail }[] = [
  { id: "email", label: "E-Mail", Icon: Mail },
  { id: "shutdown", label: "Shutdown", Icon: Shield },
  { id: "general", label: "Connectivity", Icon: Cable },
  { id: "simulator", label: "Simulator", Icon: FlaskConical },
];

function MetricRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="metric-row">
      <div className="metric-row__copy">
        <span className="metric-row__label">{label}</span>
        {hint ? <span className="metric-row__hint">{hint}</span> : null}
      </div>
      <div className="metric-row__control">{children}</div>
    </div>
  );
}

function UnitInput({
  value,
  onChange,
  min,
  max,
  unit,
  disabled,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  unit: string;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <label className="unit-field">
      <input
        type="number"
        className="input-compact"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="unit-field__suffix">{unit}</span>
      <span className="unit-field__range">
        {min}–{max}
      </span>
    </label>
  );
}

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
        subtitle="E-mail alerts, shutdown policy, connectivity, and simulator controls"
      />

      <form className="settings-workspace" onSubmit={onSave}>
        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              className={section === id ? "settings-tab is-active" : "settings-tab"}
              onClick={() => setSection(id)}
            >
              <Icon aria-hidden size={15} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>

        <div className="settings-body" role="tabpanel">
          {section === "email" ? (
            <section className="panel settings-surface">
              <div className="panel__head">
                <h2>
                  <Mail aria-hidden size={16} strokeWidth={2} /> E-Mail notifications
                </h2>
              </div>

              <label className="toggle-row">
                <span>
                  <strong>Enable e-mail notifications</strong>
                  <span className="toggle-row__hint">SMTP delivery for alarm and power events</span>
                </span>
                <input
                  type="checkbox"
                  checked={settings.emailEnabled}
                  onChange={(e) => update("emailEnabled", e.target.checked)}
                />
              </label>

              <div className="settings-block" data-disabled={!settings.emailEnabled || undefined}>
                <div className="form-grid form-grid--2">
                  <label className="field">
                    <span>SMTP host</span>
                    <input
                      value={settings.emailSmtpHost}
                      disabled={!settings.emailEnabled}
                      onChange={(e) => update("emailSmtpHost", e.target.value)}
                      placeholder="smtp.example.com"
                    />
                  </label>
                  <label className="field">
                    <span>SMTP port</span>
                    <input
                      type="number"
                      className="input-compact"
                      min={1}
                      max={65535}
                      value={settings.emailSmtpPort}
                      disabled={!settings.emailEnabled}
                      onChange={(e) => update("emailSmtpPort", Number(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Username</span>
                    <input
                      value={settings.emailUsername}
                      disabled={!settings.emailEnabled}
                      onChange={(e) => update("emailUsername", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={settings.emailPassword}
                      disabled={!settings.emailEnabled}
                      onChange={(e) => update("emailPassword", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>From address</span>
                    <input
                      value={settings.emailFrom}
                      disabled={!settings.emailEnabled}
                      onChange={(e) => update("emailFrom", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>To address</span>
                    <input
                      value={settings.emailTo}
                      disabled={!settings.emailEnabled}
                      onChange={(e) => update("emailTo", e.target.value)}
                    />
                  </label>
                </div>

                <div className="choice-grid">
                  <label className="choice choice--plain">
                    <input
                      type="checkbox"
                      checked={settings.emailOnAlarm}
                      disabled={!settings.emailEnabled}
                      onChange={(e) => update("emailOnAlarm", e.target.checked)}
                    />
                    <span>Notify on alarm</span>
                  </label>
                  <label className="choice choice--plain">
                    <input
                      type="checkbox"
                      checked={settings.emailOnPowerFail}
                      disabled={!settings.emailEnabled}
                      onChange={(e) => update("emailOnPowerFail", e.target.checked)}
                    />
                    <span>Notify on power fail</span>
                  </label>
                  <label className="choice choice--plain">
                    <input
                      type="checkbox"
                      checked={settings.emailOnLowBattery}
                      disabled={!settings.emailEnabled}
                      onChange={(e) => update("emailOnLowBattery", e.target.checked)}
                    />
                    <span>Notify on low battery</span>
                  </label>
                </div>
              </div>
            </section>
          ) : null}

          {section === "shutdown" ? (
            <>
              <section className="panel settings-surface">
                <div className="panel__head">
                  <h2>
                    <Shield aria-hidden size={16} strokeWidth={2} /> KPower power control
                  </h2>
                </div>

                <label className="toggle-row">
                  <span>
                    <strong>KPower power control</strong>
                    <span className="toggle-row__hint">
                      Automatic OS shutdown when utility or battery conditions are met
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.powerControlEnabled}
                    onChange={(e) => update("powerControlEnabled", e.target.checked)}
                  />
                </label>

                <div
                  className="settings-block"
                  data-disabled={!settings.powerControlEnabled || undefined}
                >
                  <MetricRow
                    label="Shutdown after main AC fault"
                    hint="Delay before initiating system shutdown"
                  >
                    <UnitInput
                      value={settings.shutdownMinutesAfterAcFault}
                      min={0}
                      max={2880}
                      unit="min"
                      disabled={!settings.powerControlEnabled}
                      ariaLabel="Minutes after AC fault before shutdown"
                      onChange={(n) => update("shutdownMinutesAfterAcFault", n)}
                    />
                  </MetricRow>

                  <MetricRow
                    label="Shutdown on low battery"
                    hint="Delay after low-battery condition"
                  >
                    <UnitInput
                      value={settings.shutdownMinutesOnLowBattery}
                      min={0}
                      max={600}
                      unit="min"
                      disabled={!settings.powerControlEnabled}
                      ariaLabel="Minutes after low battery before shutdown"
                      onChange={(n) => update("shutdownMinutesOnLowBattery", n)}
                    />
                  </MetricRow>

                  <MetricRow
                    label="Shutdown when battery capacity below"
                    hint="After AC fault, trigger at this remaining capacity"
                  >
                    <UnitInput
                      value={settings.shutdownBatteryPercentAfterAcFault}
                      min={1}
                      max={100}
                      unit="%"
                      disabled={!settings.powerControlEnabled}
                      ariaLabel="Battery percent threshold after AC fault"
                      onChange={(n) => update("shutdownBatteryPercentAfterAcFault", n)}
                    />
                  </MetricRow>

                  <div className="settings-divider" />

                  <div className="choice-grid">
                    <label className="choice choice--plain">
                      <input
                        type="checkbox"
                        checked={settings.shutdownOs}
                        disabled={!settings.powerControlEnabled}
                        onChange={(e) => update("shutdownOs", e.target.checked)}
                      />
                      <span>Shutdown operating system</span>
                    </label>
                    <label className="choice choice--plain">
                      <input
                        type="checkbox"
                        checked={settings.commandFileEnabled}
                        disabled={!settings.powerControlEnabled}
                        onChange={(e) => update("commandFileEnabled", e.target.checked)}
                      />
                      <span>Run command file before shutdown</span>
                    </label>
                  </div>

                  <MetricRow label="Command file" hint="Script executed before OS shutdown">
                    <div className="browse-row browse-row--compact">
                      <input
                        value={settings.commandFilePath}
                        disabled={!settings.powerControlEnabled || !settings.commandFileEnabled}
                        onChange={(e) => update("commandFilePath", e.target.value)}
                        placeholder="C:\\scripts\\pre-shutdown.bat"
                        aria-label="Command file path"
                      />
                      <button
                        type="button"
                        className="btn btn--secondary"
                        disabled={!settings.powerControlEnabled || !settings.commandFileEnabled}
                        onClick={() => {
                          const path = window.prompt("Command file path", settings.commandFilePath);
                          if (path != null) update("commandFilePath", path);
                        }}
                      >
                        Browse
                      </button>
                    </div>
                  </MetricRow>

                  <MetricRow label="Maximum execution time" hint="Abort the script after this limit">
                    <UnitInput
                      value={settings.commandMaxExecutionMinutes}
                      min={1}
                      max={120}
                      unit="min"
                      disabled={!settings.powerControlEnabled || !settings.commandFileEnabled}
                      ariaLabel="Maximum command file execution time in minutes"
                      onChange={(n) => update("commandMaxExecutionMinutes", n)}
                    />
                  </MetricRow>
                </div>
              </section>

              <section className="panel settings-surface">
                <div className="panel__head">
                  <h2>UPS power off</h2>
                </div>

                <label className="toggle-row">
                  <span>
                    <strong>UPS power off</strong>
                    <span className="toggle-row__hint">
                      Power down the UPS after the operating system has shut down
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.upsPowerOffEnabled}
                    onChange={(e) => update("upsPowerOffEnabled", e.target.checked)}
                  />
                </label>

                <div
                  className="settings-block"
                  data-disabled={!settings.upsPowerOffEnabled || undefined}
                >
                  <MetricRow
                    label="Delay before UPS turns off"
                    hint="Time allowed for OS shutdown to complete"
                  >
                    <UnitInput
                      value={settings.upsPowerOffDelayMinutes}
                      min={1}
                      max={9}
                      unit="min"
                      disabled={!settings.upsPowerOffEnabled}
                      ariaLabel="Minutes before UPS turns off"
                      onChange={(n) => update("upsPowerOffDelayMinutes", n)}
                    />
                  </MetricRow>
                </div>
              </section>
            </>
          ) : null}

          {section === "general" ? (
            <section className="panel settings-surface">
              <div className="panel__head">
                <h2>
                  <Cable aria-hidden size={16} strokeWidth={2} /> Connectivity & workstation
                </h2>
              </div>

              <div className="settings-block">
                <MetricRow label="Poll interval" hint="How often telemetry is refreshed">
                  <UnitInput
                    value={settings.pollIntervalMs}
                    min={500}
                    max={10000}
                    unit="ms"
                    ariaLabel="Poll interval in milliseconds"
                    onChange={(n) => update("pollIntervalMs", n)}
                  />
                </MetricRow>

                <div className="form-grid form-grid--2">
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
                      onChange={(e) =>
                        update("commsType", e.target.value as AppSettings["commsType"])
                      }
                    >
                      <option value="usb">USB HID device</option>
                      <option value="serial">Serial port</option>
                    </select>
                  </label>
                </div>

                <div className="choice-grid">
                  <label className="choice choice--plain">
                    <input
                      type="checkbox"
                      checked={settings.startWithWindows}
                      onChange={(e) => update("startWithWindows", e.target.checked)}
                    />
                    <span>Start with Windows</span>
                  </label>
                  <label className="choice choice--plain">
                    <input
                      type="checkbox"
                      checked={settings.minimizeToTray}
                      onChange={(e) => update("minimizeToTray", e.target.checked)}
                    />
                    <span>Minimize to system tray</span>
                  </label>
                  <label className="choice choice--plain">
                    <input
                      type="checkbox"
                      checked={settings.simulateAlarms}
                      onChange={(e) => update("simulateAlarms", e.target.checked)}
                    />
                    <span>Allow simulated alarm injection</span>
                  </label>
                </div>
              </div>
            </section>
          ) : null}

          {section === "simulator" ? (
            <section className="panel settings-surface">
              <div className="panel__head">
                <h2>
                  <FlaskConical aria-hidden size={16} strokeWidth={2} /> Simulator lab
                </h2>
                <span className="panel__tag">Development</span>
              </div>
              <p className="settings-lead">
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
            </section>
          ) : null}
        </div>

        <div className="settings-sticky-bar">
          <div className="settings-sticky-bar__copy">
            <strong>Apply configuration</strong>
            <p>Persisted locally until native settings storage ships.</p>
          </div>
          <div className="row-actions">
            {saved ? <p className="flash">Settings saved.</p> : null}
            <button type="button" className="btn btn--secondary" onClick={onReset}>
              Reset defaults
            </button>
            <button type="submit" className="btn btn--primary">
              <Save aria-hidden size={15} strokeWidth={2} /> Save settings
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
