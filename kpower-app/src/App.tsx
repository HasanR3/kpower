import { useEffect, useState } from "react";
import { AppNav, type AppRoute } from "./components/AppNav";
import { StatusBar } from "./components/StatusBar";
import { AlarmsPage } from "./pages/AlarmsPage";
import { ControlPage } from "./pages/ControlPage";
import { DevicePage } from "./pages/DevicePage";
import { HistoryPage } from "./pages/HistoryPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SchedulePage } from "./pages/SchedulePage";
import { SettingsPage } from "./pages/SettingsPage";
import { subscribeUps } from "./lib/upsStore";
import type { UpsSnapshot } from "./lib/types";
import "./styles/app.css";

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

  return (
    <div className="app-shell">
      <StatusBar snapshot={snapshot} />
      <AppNav route={route} onNavigate={setRoute} />
      <main>{renderPage(route, snapshot, setRoute)}</main>
    </div>
  );
}
