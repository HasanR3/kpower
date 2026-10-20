import { lazy, Suspense, useEffect, useState } from "react";
import { AppNav, type AppRoute } from "./components/AppNav";
import { StatusBar } from "./components/StatusBar";
import { evaluateAlarms } from "./lib/alarmEngine";
import { loadAlarms, loadSettings, saveAlarms } from "./lib/appData";
import { maybeNotifyNewAlarms } from "./lib/notifications";
import { tickSchedules } from "./lib/scheduleRunner";
import { getLastSuccessfulPollAt, getUpsLinkError, subscribeUps } from "./lib/upsStore";
import type { UpsSnapshot } from "./lib/types";
import "./styles/app.css";

const OverviewPage = lazy(() =>
  import("./pages/OverviewPage").then((m) => ({ default: m.OverviewPage })),
);
const DevicePage = lazy(() =>
  import("./pages/DevicePage").then((m) => ({ default: m.DevicePage })),
);
const AlarmsPage = lazy(() =>
  import("./pages/AlarmsPage").then((m) => ({ default: m.AlarmsPage })),
);
const SchedulePage = lazy(() =>
  import("./pages/SchedulePage").then((m) => ({ default: m.SchedulePage })),
);
const ControlPage = lazy(() =>
  import("./pages/ControlPage").then((m) => ({ default: m.ControlPage })),
);
const HistoryPage = lazy(() =>
  import("./pages/HistoryPage").then((m) => ({ default: m.HistoryPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);

function renderPage(
  route: AppRoute,
  snapshot: UpsSnapshot | null,
  onNavigate: (r: AppRoute) => void,
) {
  switch (route) {
    case "overview":
      return <OverviewPage snapshot={snapshot} onNavigate={onNavigate} />;
    case "device":
      return <DevicePage snapshot={snapshot} />;
    case "alarms":
      return <AlarmsPage snapshot={snapshot} />;
    case "schedule":
      return <SchedulePage />;
    case "control":
      return <ControlPage snapshot={snapshot} />;
    case "history":
      return <HistoryPage />;
    case "settings":
      return <SettingsPage />;
  }
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>("overview");
  const [snapshot, setSnapshot] = useState<UpsSnapshot | null>(null);

  useEffect(() => subscribeUps(setSnapshot), []);

  useEffect(() => {
    const prev = loadAlarms();
    const next = evaluateAlarms(
      prev,
      snapshot,
      loadSettings(),
      getLastSuccessfulPollAt(),
      getUpsLinkError(),
    );
    saveAlarms(next);
    const active = next.filter((a) => a.active);
    void maybeNotifyNewAlarms(
      active.map((a) => a.code),
      active.map((a) => ({ code: a.code, message: a.message, severity: a.severity })),
    );
  }, [snapshot]);

  useEffect(() => {
    const id = setInterval(() => {
      void tickSchedules();
    }, 15_000);
    void tickSchedules();
    return () => clearInterval(id);
  }, []);

  return (
    <div className="app-shell">
      <StatusBar snapshot={snapshot} />
      <AppNav route={route} onNavigate={setRoute} />
      <main>
        <Suspense fallback={<p className="page-loading">Loading…</p>}>
          {renderPage(route, snapshot, setRoute)}
        </Suspense>
      </main>
    </div>
  );
}
