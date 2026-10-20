export function AlarmsPage() {
  return (
    <section className="page">
      <h1>Alarms</h1>
      <p className="muted">No active alarms. History arrives in a later phase.</p>
    </section>
  );
}

export function SchedulePage() {
  return (
    <section className="page">
      <h1>Schedule</h1>
      <p className="muted">Scheduled actions will appear here.</p>
    </section>
  );
}

export function ControlPage() {
  return (
    <section className="page">
      <h1>Control</h1>
      <p className="muted">UPS commands (self-test, buzzer, power) land in a later phase. No commands are sent from this stub.</p>
    </section>
  );
}

export function HistoryPage() {
  return (
    <section className="page">
      <h1>History</h1>
      <p className="muted">Logged metrics and events will appear here.</p>
    </section>
  );
}

export function SettingsPage() {
  return (
    <section className="page">
      <h1>Settings</h1>
      <p className="muted">Poll interval, shutdown thresholds, and tray options come next.</p>
    </section>
  );
}
