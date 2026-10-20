import type { UpsSnapshot } from "../lib/types";
import { formatRuntime } from "../lib/healthScore";

type FlowState = "forward" | "reverse" | "idle" | "alert";

function fmt(n: number, digits = 0): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

/** Balanced topology geometry (viewBox 800×340) */
const GEO = {
  midY: 118,
  util: { x: 36, y: 48, w: 148, h: 140 },
  ups: { x: 268, y: 36, w: 184, h: 164 },
  load: { x: 536, y: 48, w: 148, h: 140 },
  bat: { x: 290, y: 236, w: 140, h: 86 },
} as const;

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

  const { midY, util, ups, load, bat } = GEO;
  const utilCx = util.x + util.w / 2;
  const upsCx = ups.x + ups.w / 2;
  const loadCx = load.x + load.w / 2;
  const railLeft = util.x + util.w + 6;
  const railRightStart = ups.x + ups.w + 6;
  const railRightEnd = load.x - 6;
  const railVertTop = ups.y + ups.h + 4;
  const railVertBot = bat.y - 4;

  return (
    <section className="topology panel" aria-label="Power topology">
      <div className="panel__head">
        <h2>Power topology</h2>
        <span className="panel__tag">{connected ? snapshot!.mode : "offline"}</span>
      </div>

      <div className="topology-stage">
        <svg
          className="topology-svg"
          viewBox="0 0 720 340"
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
            <filter id="topoSoft" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f1724" floodOpacity="0.07" />
            </filter>
          </defs>

          {/* Horizontal rails — equal gaps */}
          <path
            className={`topo-rail ${utilityToUps !== "idle" ? "topo-rail--live" : ""}`}
            d={`M ${railLeft} ${midY} H ${ups.x - 6}`}
          />
          <path
            className={`topo-rail ${upsToLoad !== "idle" ? "topo-rail--live" : ""}`}
            d={`M ${railRightStart} ${midY} H ${railRightEnd}`}
          />
          <path
            className={`topo-rail topo-rail--vert ${
              upsToBattery !== "idle"
                ? upsToBattery === "reverse"
                  ? "topo-rail--warn"
                  : "topo-rail--live"
                : ""
            }`}
            d={`M ${upsCx} ${railVertTop} V ${railVertBot}`}
          />

          {/* Evenly spaced chevrons on left rail */}
          <g className={`topo-flow ${utilityToUps === "forward" ? "topo-flow--on" : ""}`}>
            {[0.22, 0.42, 0.62, 0.82].map((t) => {
              const x = railLeft + (ups.x - 6 - railLeft) * t;
              return <polygon key={t} points={`${x},${midY} ${x + 10},${midY - 6} ${x + 10},${midY + 6}`} />;
            })}
          </g>
          <g className={`topo-flow ${upsToLoad === "forward" ? "topo-flow--on" : ""}`}>
            {[0.22, 0.42, 0.62, 0.82].map((t) => {
              const x = railRightStart + (railRightEnd - railRightStart) * t;
              return <polygon key={t} points={`${x},${midY} ${x + 10},${midY - 6} ${x + 10},${midY + 6}`} />;
            })}
          </g>
          <g
            className={`topo-flow ${
              upsToBattery === "forward"
                ? "topo-flow--on"
                : upsToBattery === "reverse"
                  ? "topo-flow--on topo-flow--warn"
                  : ""
            }`}
          >
            {[0.35, 0.65].map((t) => {
              const y = railVertTop + (railVertBot - railVertTop) * t;
              const up = upsToBattery === "reverse";
              return up ? (
                <polygon key={t} points={`${upsCx},${y - 8} ${upsCx - 6},${y + 2} ${upsCx + 6},${y + 2}`} />
              ) : (
                <polygon key={t} points={`${upsCx},${y + 8} ${upsCx - 6},${y - 2} ${upsCx + 6},${y - 2}`} />
              );
            })}
          </g>

          {/* Utility */}
          <g className={`topo-node ${utilityActive ? "topo-node--live" : ""}`} filter="url(#topoSoft)">
            <rect x={util.x} y={util.y} width={util.w} height={util.h} rx="14" />
            <g transform={`translate(${utilCx - 24}, ${util.y + 22})`} fill="none" stroke="currentColor" strokeWidth="2.1">
              <path d="M24 4 V20" />
              <path d="M14 20 H34" />
              <path d="M10 30 H38" />
              <path d="M6 40 H42" />
              <path d="M24 20 V54" />
              <path d="M14 54 H34" />
            </g>
            <text x={utilCx} y={util.y + util.h - 36} textAnchor="middle" className="topo-label">
              Utility grid
            </text>
            <text x={utilCx} y={util.y + util.h - 16} textAnchor="middle" className="topo-value">
              {connected ? `${fmt(snapshot!.inputVoltage, 1)} voltage in` : "—"}
            </text>
          </g>

          {/* UPS */}
          <g
            className={`topo-node topo-node--core ${upsActive ? "topo-node--live" : fault ? "topo-node--fault" : ""}`}
            filter="url(#topoSoft)"
          >
            <rect x={ups.x} y={ups.y} width={ups.w} height={ups.h} rx="16" />
            <rect x={ups.x + 28} y={ups.y + 18} width={ups.w - 56} height={24} rx="6" className="topo-screen" />
            <text x={upsCx} y={ups.y + 35} textAnchor="middle" className="topo-screen-text">
              {connected ? snapshot!.mode.toUpperCase() : "OFFLINE"}
            </text>
            <circle cx={upsCx} cy={ups.y + 78} r="16" className="topo-badge" />
            <path d={`M${upsCx - 4} ${ups.y + 70} l5 8 h-3.5 l2.5 10 l-7-10 h3.5 z`} fill="#fff" />
            <text x={upsCx} y={ups.y + ups.h - 36} textAnchor="middle" className="topo-label">
              UPS
            </text>
            <text x={upsCx} y={ups.y + ups.h - 16} textAnchor="middle" className="topo-value">
              {connected ? `${fmt(snapshot!.outputVoltage, 1)} voltage out` : "No link"}
            </text>
          </g>

          {/* Load */}
          <g className={`topo-node ${loadActive ? "topo-node--live" : ""}`} filter="url(#topoSoft)">
            <rect x={load.x} y={load.y} width={load.w} height={load.h} rx="14" />
            <g transform={`translate(${loadCx - 24}, ${load.y + 24})`} fill="none" stroke="currentColor" strokeWidth="2.1">
              <path d="M10 48 V24 H38 V48" />
              <path d="M6 48 H42" />
              <path d="M16 32 h6 v6 h-6 z" />
              <path d="M26 32 h6 v6 h-6 z" />
              <path d="M20 16 l12-10 12 10" />
            </g>
            <text x={loadCx} y={load.y + load.h - 36} textAnchor="middle" className="topo-label">
              Protected load
            </text>
            <text x={loadCx} y={load.y + load.h - 16} textAnchor="middle" className="topo-value">
              {connected ? `${fmt(snapshot!.loadPercent, 0)}% output load` : "—"}
            </text>
          </g>

          {/* Battery */}
          <g
            className={`topo-node topo-node--battery ${
              batteryActive ? "topo-node--warn" : batteryCharging ? "topo-node--live" : ""
            }`}
            filter="url(#topoSoft)"
          >
            <rect x={bat.x} y={bat.y} width={bat.w} height={bat.h} rx="12" />
            <g transform={`translate(${upsCx - 26}, ${bat.y + 10})`} fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="0" y="4" width="44" height="22" rx="3" />
              <rect x="44" y="10" width="5" height="10" rx="1" />
              <rect x="5" y="9" width="7" height="12" rx="1" className="topo-cell" />
              <rect x="15" y="9" width="7" height="12" rx="1" className="topo-cell" />
              <rect x="25" y="9" width="7" height="12" rx="1" className="topo-cell" />
            </g>
            <text x={upsCx} y={bat.y + bat.h - 28} textAnchor="middle" className="topo-label">
              Battery bank
            </text>
            <text x={upsCx} y={bat.y + bat.h - 10} textAnchor="middle" className="topo-value topo-value--sm">
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
