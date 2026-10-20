import type { UpsSnapshot } from "../lib/types";

function formatRuntime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function modeLabel(mode: UpsSnapshot["mode"]): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function StatusBar({ snapshot }: { snapshot: UpsSnapshot | null }) {
  if (!snapshot || !snapshot.connected) {
    return (
      <header className="status-bar" data-testid="status-bar">
        <span className="status-pill status-pill--danger">Disconnected</span>
      </header>
    );
  }

  return (
    <header className="status-bar" data-testid="status-bar">
      <span className="status-pill status-pill--ok">Connected</span>
      <span className="status-meta">{modeLabel(snapshot.mode)}</span>
      <span className="status-meta">Runtime {formatRuntime(snapshot.runtimeSeconds)}</span>
    </header>
  );
}
