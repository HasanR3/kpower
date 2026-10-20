export type AppRoute =
  | "overview"
  | "device"
  | "alarms"
  | "schedule"
  | "control"
  | "history"
  | "settings";

const ITEMS: { id: AppRoute; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "device", label: "Device" },
  { id: "alarms", label: "Alarms" },
  { id: "schedule", label: "Schedule" },
  { id: "control", label: "Control" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
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
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={route === item.id ? "nav-btn nav-btn--active" : "nav-btn"}
          onClick={() => onNavigate(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
