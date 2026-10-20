import type { UpsSnapshot } from "../lib/types";
import { formatRuntime } from "../lib/healthScore";

type FlowState = "forward" | "reverse" | "idle" | "alert";

function fmt(n: number, digits = 0): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export function PowerTopology({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const connected = Boolean(snapshot?.connected);
  const onBattery = connected && snapshot?.mode === "battery";
  const fault = connected && snapshot?.mode === "fault";
  const bypass = connected && snapshot?.mode === "bypass";

  const utilityActive = connected && !onBattery && !fault;
  const upsActive = connected && !fault;
  const loadActive = connected && !fault;
  const batteryActive = onBattery;
  const batteryCharging = utilityActive && (snapshot?.batteryPercent ?? 100) < 99.5;

  const utilityToUps: FlowState = utilityActive ? "forward" : "idle";
  const upsToLoad: FlowState = loadActive ? "forward" : fault ? "alert" : "idle";
  const upsToBattery: FlowState = batteryActive
    ? "reverse"
    : batteryCharging
      ? "forward"
      : "idle";

  const statusLine = !connected
    ? "No UPS telemetry — topology idle"
    : fault
      ? "Fault reported — verify device and clear alarms"
      : onBattery
        ? "Utility lost — battery supplying protected load"
        : bypass
          ? "Bypass path active"
          : "Utility feeding UPS — battery on reserve";

  return (
    <section className="topology panel" aria-label="Power topology">
      <div className="panel__head">
        <h2>Power topology</h2>
        <span className="panel__tag">{connected ? snapshot!.mode : "offline"}</span>
      </div>

      <div className="topology-stage">
        <svg
          className="topology-svg"
          viewBox="0 0 920 420"
          role="img"
          aria-label="Utility to UPS to load with battery branch"
        >
          <defs>
            <linearGradient id="topoRail" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c5ceda" />
              <stop offset="50%" stopColor="#9aa8b8" />
              <stop offset="100%" stopColor="#c5ceda" />
            </linearGradient>
            <linearGradient id="topoLive" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>
            <linearGradient id="topoWarn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
            <filter id="topoSoft" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f1724" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* Rails */}
          <path
            className={`topo-rail ${utilityToUps !== "idle" ? "topo-rail--live" : ""}`}
            d="M 150 150 H 360"
          />
          <path
            className={`topo-rail ${upsToLoad !== "idle" ? "topo-rail--live" : ""}`}
            d="M 560 150 H 770"
          />
          <path
            className={`topo-rail topo-rail--vert ${upsToBattery !== "idle" ? (upsToBattery === "reverse" ? "topo-rail--warn" : "topo-rail--live") : ""}`}
            d="M 460 230 V 310"
          />

          {/* Flow chevrons */}
          <g className={`topo-flow ${utilityToUps === "forward" ? "topo-flow--on" : ""}`}>
            <polygon points="210,150 222,143 222,157" />
            <polygon points="250,150 262,143 262,157" />
            <polygon points="290,150 302,143 302,157" />
            <polygon points="330,150 342,143 342,157" />
          </g>
          <g className={`topo-flow ${upsToLoad === "forward" ? "topo-flow--on" : ""}`}>
            <polygon points="620,150 632,143 632,157" />
            <polygon points="660,150 672,143 672,157" />
            <polygon points="700,150 712,143 712,157" />
            <polygon points="740,150 752,143 752,157" />
          </g>
          <g
            className={`topo-flow topo-flow--down ${
              upsToBattery === "forward"
                ? "topo-flow--on"
                : upsToBattery === "reverse"
                  ? "topo-flow--on topo-flow--warn"
                  : ""
            }`}
          >
            <polygon points="460,250 453,262 467,262" />
            <polygon points="460,275 453,287 467,287" />
          </g>

          {/* Utility node */}
          <g className={`topo-node ${utilityActive ? "topo-node--live" : ""}`} filter="url(#topoSoft)">
            <rect x="40" y="70" width="140" height="160" rx="16" />
            <g transform="translate(78,95)" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M32 8 V28" />
              <path d="M20 28 H44" />
              <path d="M14 40 H50" />
              <path d="M8 52 H56" />
              <path d="M32 28 V70" />
              <path d="M18 70 H46" />
            </g>
            <text x="110" y="185" textAnchor="middle" className="topo-label">
              Utility grid
            </text>
            <text x="110" y="208" textAnchor="middle" className="topo-value">
              {connected ? `${fmt(snapshot!.inputVoltage, 1)} V` : "—"}
            </text>
          </g>

          {/* UPS node */}
          <g className={`topo-node topo-node--core ${upsActive ? "topo-node--live" : fault ? "topo-node--fault" : ""}`} filter="url(#topoSoft)">
            <rect x="360" y="55" width="200" height="175" rx="18" />
            <rect x="390" y="78" width="140" height="28" rx="6" className="topo-screen" />
            <text x="460" y="97" textAnchor="middle" className="topo-screen-text">
              {connected ? snapshot!.mode.toUpperCase() : "OFFLINE"}
            </text>
            <circle cx="460" cy="140" r="18" className="topo-badge" />
            <path
              d="M455 130 l6 10 h-4 l3 12 l-8-12 h4 z"
              fill="#fff"
            />
            <text x="460" y="185" textAnchor="middle" className="topo-label">
              UPS
            </text>
            <text x="460" y="208" textAnchor="middle" className="topo-value">
              {connected ? `${fmt(snapshot!.outputVoltage, 1)} V out` : "No link"}
            </text>
          </g>

          {/* Load node */}
          <g className={`topo-node ${loadActive ? "topo-node--live" : ""}`} filter="url(#topoSoft)">
            <rect x="740" y="70" width="140" height="160" rx="16" />
            <g transform="translate(778,98)" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 58 V28 H52 V58" />
              <path d="M8 58 H56" />
              <path d="M22 38 h8 v8 h-8 z" />
              <path d="M36 38 h8 v8 h-8 z" />
              <path d="M28 18 l12-10 12 10" />
            </g>
            <text x="810" y="185" textAnchor="middle" className="topo-label">
              Protected load
            </text>
            <text x="810" y="208" textAnchor="middle" className="topo-value">
              {connected ? `${fmt(snapshot!.loadPercent, 0)}% load` : "—"}
            </text>
          </g>

          {/* Battery node */}
          <g
            className={`topo-node topo-node--battery ${
              batteryActive ? "topo-node--warn" : batteryCharging ? "topo-node--live" : connected ? "" : ""
            }`}
            filter="url(#topoSoft)"
          >
            <rect x="380" y="310" width="160" height="90" rx="14" />
            <g transform="translate(430,328)" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="0" y="8" width="52" height="28" rx="4" />
              <rect x="52" y="16" width="6" height="12" rx="1" />
              <rect x="6" y="14" width="8" height="16" rx="1" className="topo-cell" />
              <rect x="18" y="14" width="8" height="16" rx="1" className="topo-cell" />
              <rect x="30" y="14" width="8" height="16" rx="1" className="topo-cell" />
            </g>
            <text x="460" y="372" textAnchor="middle" className="topo-label">
              Battery bank
            </text>
            <text x="460" y="390" textAnchor="middle" className="topo-value topo-value--sm">
              {connected
                ? `${fmt(snapshot!.batteryPercent, 0)}% · ${formatRuntime(snapshot!.runtimeSeconds)}`
                : "—"}
            </text>
          </g>
        </svg>
      </div>

      <div className="topology-legend">
        <span className="topology-legend__item">
          <i className="topo-dot topo-dot--live" /> Live flow
        </span>
        <span className="topology-legend__item">
          <i className="topo-dot topo-dot--warn" /> Battery path
        </span>
        <span className="topology-legend__item">
          <i className="topo-dot" /> Idle
        </span>
        <p className="topology-status">{statusLine}</p>
      </div>
    </section>
  );
}
