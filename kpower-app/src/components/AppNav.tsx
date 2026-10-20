import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarClock,
  Gauge,
  History,
  LayoutDashboard,
  Settings,
  Zap,
} from "lucide-react";

export type AppRoute =
  | "overview"
  | "device"
  | "alarms"
  | "schedule"
  | "control"
  | "history"
  | "settings";

const ITEMS: { id: AppRoute; label: string; Icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "device", label: "Device", Icon: Gauge },
  { id: "alarms", label: "Alarms", Icon: Bell },
  { id: "schedule", label: "Schedule", Icon: CalendarClock },
  { id: "control", label: "Control", Icon: Zap },
  { id: "history", label: "History", Icon: History },
  { id: "settings", label: "Settings", Icon: Settings },
];

export function AppNav({
  route,
  onNavigate,
}: {
  route: AppRoute;
  onNavigate: (r: AppRoute) => void;
}) {
  return (
    <nav className="app-nav" aria-label="Main">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={route === id ? "nav-btn nav-btn--active" : "nav-btn"}
          onClick={() => onNavigate(id)}
        >
          <Icon className="nav-btn__icon" aria-hidden size={16} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
