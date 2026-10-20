import { useEffect, useState } from "react";
import { AppNav, type AppRoute } from "./components/AppNav";
import { StatusBar } from "./components/StatusBar";
import { DevicePage } from "./pages/DevicePage";
import {
  AlarmsPage,
  ControlPage,
  HistoryPage,
  SchedulePage,
  SettingsPage,
} from "./pages/StubPages";
import { subscribeUps } from "./lib/upsStore";
import type { UpsSnapshot } from "./lib/types";
import "./styles/app.css";

function renderPage(route: AppRoute, snapshot: UpsSnapshot | null) {
  switch (route) {
    case "device":
      return <DevicePage snapshot={snapshot} />;
    case "alarms":
      return <AlarmsPage />;
    case "schedule":
      return <SchedulePage />;
    case "control":
      return <ControlPage />;
    case "history":
      return <HistoryPage />;
    case "settings":
      return <SettingsPage />;
  }
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>("device");
  const [snapshot, setSnapshot] = useState<UpsSnapshot | null>(null);

  useEffect(() => subscribeUps(setSnapshot), []);

  return (
    <div className="app-shell">
      <StatusBar snapshot={snapshot} />
      <AppNav route={route} onNavigate={setRoute} />
      <main>{renderPage(route, snapshot)}</main>
    </div>
  );
}
