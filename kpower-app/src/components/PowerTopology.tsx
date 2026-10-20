import type { UpsSnapshot } from "../lib/types";
import { formatRuntime } from "../lib/healthScore";

type FlowDir = "idle" | "forward" | "reverse" | "alert";

function fmt(n: number, digits = 0): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

/** Tip points right — Utility → UPS → Load */
function chevronRight(x: number, y: number): string {
  return `${x + 9},${y} ${x},${y - 5.5} ${x},${y + 5.5}`;
}

/** Tip points up — Battery → UPS (discharge) */
function chevronUp(cx: number, y: number): string {
  return `${cx},${y - 7} ${cx - 5.5},${y + 3} ${cx + 5.5},${y + 3}`;
}

/** Tip points down — UPS → Battery (charge) */
function chevronDown(cx: number, y: number): string {
  return `${cx},${y + 7} ${cx - 5.5},${y - 3} ${cx + 5.5},${y - 3}`;
}

/**
 * Power-flow truth table
 * LINE / BYPASS: Utility → UPS → Load; Battery ↓ only while charging
 * BATTERY:       Utility idle; Battery ↑ → UPS → Load
 * FAULT / OFF:   all idle
 */
function resolveFlows(snapshot: UpsSnapshot | null) {
  const connected = Boolean(snapshot?.connected);
  const mode = snapshot?.mode;
  const onBattery = connected && mode === "battery";
  const fault = connected && mode === "fault";
  const bypass = connected && mode === "bypass";
  const onLine = connected && (mode === "line" || bypass);

  const batteryPct = snapshot?.batteryPercent ?? 100;
  const charging = onLine && batteryPct < 99.5;

  const utilityActive = onLine && !fault;
  const upsActive = connected && !fault;
  const loadActive = connected && !fault;
  const batteryDischarging = onBattery;
  const batteryCharging = charging;

  let utilityToUps: FlowDir = "idle";
  let upsToLoad: FlowDir = "idle";
  let batteryRail: FlowDir = "idle";

  if (fault || !connected) {
    utilityToUps = "idle";
    upsToLoad = fault ? "alert" : "idle";
    batteryRail = "idle";
  } else if (onBattery) {
    // Grid lost — energy leaves the battery upward into the UPS, then out to load
    utilityToUps = "idle";
    upsToLoad = "forward";
    batteryRail = "reverse";
  } else {
    // LINE / BYPASS — grid feeds UPS, UPS feeds load
    utilityToUps = "forward";
    upsToLoad = "forward";
    batteryRail = charging ? "forward" : "idle";
  }

  const statusLine = !connected
    ? "No UPS telemetry — topology idle"
    : fault
      ? "Fault reported — verify device and clear alarms"
      : onBattery
        ? "Utility lost — battery supplying protected load"
        : bypass
          ? "Bypass path active — utility feeding load"
          : charging
            ? "Utility feeding UPS — battery charging"
            : "Utility feeding UPS — battery on reserve";

  return {
    connected,
    onBattery,
    fault,
    utilityActive,
    upsActive,
    loadActive,
    batteryDischarging,
    batteryCharging,
    utilityToUps,
    upsToLoad,
    batteryRail,
    statusLine,
  };
}

const GEO = {
  midY: 118,
  util: { x: 36, y: 48, w: 148, h: 140 },
  ups: { x: 268, y: 36, w: 184, h: 164 },
  load: { x: 536, y: 48, w: 148, h: 140 },
  bat: { x: 290, y: 236, w: 140, h: 86 },
} as const;

const RAIL_T = [0.2, 0.4, 0.6, 0.8] as const;
const VERT_T = [0.32, 0.55, 0.78] as const;

export function PowerTopology({ snapshot }: { snapshot: UpsSnapshot | null }) {
  const flow = resolveFlows(snapshot);
  const { midY, util, ups, load, bat } = GEO;
  const utilCx = util.x + util.w / 2;
  const upsCx = ups.x + ups.w / 2;
  const loadCx = load.x + load.w / 2;
  const railLeft = util.x + util.w + 8;
  const railLeftEnd = ups.x - 8;
  const railRightStart = ups.x + ups.w + 8;
  const railRightEnd = load.x - 8;
  const railVertTop = ups.y + ups.h + 6;
  const railVertBot = bat.y - 6;

  return (
    <section className="topology panel" aria-label="Power topology">
      <div className="panel__head">
        <h2>Power topology</h2>
        <span className="panel__tag">{flow.connected ? snapshot!.mode : "offline"}</span>
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

          {/* Rails */}
          <path
            className={`topo-rail ${flow.utilityToUps !== "idle" ? "topo-rail--live" : ""}`}
            d={`M ${railLeft} ${midY} H ${railLeftEnd}`}
          />
          <path
            className={`topo-rail ${
              flow.upsToLoad === "forward"
                ? "topo-rail--live"
                : flow.upsToLoad === "alert"
                  ? "topo-rail--warn"
                  : ""
            }`}
            d={`M ${railRightStart} ${midY} H ${railRightEnd}`}
          />
          <path
            className={`topo-rail topo-rail--vert ${
              flow.batteryRail === "reverse"
                ? "topo-rail--warn"
                : flow.batteryRail === "forward"
                  ? "topo-rail--live"
                  : ""
            }`}
            d={`M ${upsCx} ${railVertTop} V ${railVertBot}`}
          />

          {/* Utility → UPS (always right when live) */}
          <g className={`topo-flow ${flow.utilityToUps === "forward" ? "topo-flow--on" : ""}`}>
            {RAIL_T.map((t) => {
              const x = railLeft + (railLeftEnd - railLeft) * t;
              return <polygon key={`u-${t}`} points={chevronRight(x, midY)} />;
            })}
          </g>

          {/* UPS → Load (right) */}
          <g
            className={`topo-flow ${
              flow.upsToLoad === "forward"
                ? "topo-flow--on"
                : flow.upsToLoad === "alert"
                  ? "topo-flow--on topo-flow--warn"
                  : ""
            }`}
          >
            {RAIL_T.map((t) => {
              const x = railRightStart + (railRightEnd - railRightStart) * t;
              return <polygon key={`l-${t}`} points={chevronRight(x, midY)} />;
            })}
          </g>

          {/* Battery rail: reverse = ↑ discharge, forward = ↓ charge */}
          <g
            className={`topo-flow ${
              flow.batteryRail === "forward"
                ? "topo-flow--on"
                : flow.batteryRail === "reverse"
                  ? "topo-flow--on topo-flow--warn"
                  : ""
            }`}
          >
            {VERT_T.map((t) => {
              const y = railVertTop + (railVertBot - railVertTop) * t;
              const points =
                flow.batteryRail === "reverse" ? chevronUp(upsCx, y) : chevronDown(upsCx, y);
              return <polygon key={`b-${t}`} points={points} />;
            })}
          </g>

          {/* Utility */}
          <g className={`topo-node ${flow.utilityActive ? "topo-node--live" : ""}`} filter="url(#topoSoft)">
            <rect x={util.x} y={util.y} width={util.w} height={util.h} rx="14" />
            <g
              transform={`translate(${utilCx - 24}, ${util.y + 22})`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
              {flow.connected ? `${fmt(snapshot!.inputVoltage, 1)} voltage in` : "—"}
            </text>
          </g>

          {/* UPS */}
          <g
            className={`topo-node topo-node--core ${
              flow.upsActive ? "topo-node--live" : flow.fault ? "topo-node--fault" : ""
            }`}
            filter="url(#topoSoft)"
          >
            <rect x={ups.x} y={ups.y} width={ups.w} height={ups.h} rx="16" />
            <rect x={ups.x + 28} y={ups.y + 18} width={ups.w - 56} height={24} rx="6" className="topo-screen" />
            <text x={upsCx} y={ups.y + 35} textAnchor="middle" className="topo-screen-text">
              {flow.connected ? snapshot!.mode.toUpperCase() : "OFFLINE"}
            </text>
            <circle cx={upsCx} cy={ups.y + 78} r="16" className="topo-badge" />
            <path d={`M${upsCx - 4} ${ups.y + 70} l5 8 h-3.5 l2.5 10 l-7-10 h3.5 z`} fill="#fff" />
            <text x={upsCx} y={ups.y + ups.h - 36} textAnchor="middle" className="topo-label">
              UPS
            </text>
            <text x={upsCx} y={ups.y + ups.h - 16} textAnchor="middle" className="topo-value">
              {flow.connected ? `${fmt(snapshot!.outputVoltage, 1)} voltage out` : "No link"}
            </text>
          </g>

          {/* Protected load — building mark */}
          <g className={`topo-node ${flow.loadActive ? "topo-node--live" : ""}`} filter="url(#topoSoft)">
            <rect x={load.x} y={load.y} width={load.w} height={load.h} rx="14" />
            <g
              transform={`translate(${loadCx - 22}, ${load.y + 22})`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Facility building */}
              <path d="M4 50 V22 L22 8 L40 22 V50" />
              <path d="M2 50 H42" />
              {/* Door */}
              <path d="M18 50 V36 H26 V50" />
              {/* Windows */}
              <rect x="10" y="24" width="7" height="7" rx="1" />
              <rect x="27" y="24" width="7" height="7" rx="1" />
              {/* Antenna / service mark */}
              <path d="M22 8 V2" />
              <path d="M18 4 H26" />
            </g>
            <text x={loadCx} y={load.y + load.h - 36} textAnchor="middle" className="topo-label">
              Protected load
            </text>
            <text x={loadCx} y={load.y + load.h - 16} textAnchor="middle" className="topo-value">
              {flow.connected ? `${fmt(snapshot!.loadPercent, 0)}% output load` : "—"}
            </text>
          </g>

          {/* Battery */}
          <g
            className={`topo-node topo-node--battery ${
              flow.batteryDischarging
                ? "topo-node--warn"
                : flow.batteryCharging
                  ? "topo-node--live"
                  : ""
            }`}
            filter="url(#topoSoft)"
          >
            <rect x={bat.x} y={bat.y} width={bat.w} height={bat.h} rx="12" />
            <g
              transform={`translate(${upsCx - 26}, ${bat.y + 10})`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
              {flow.connected
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
        <p className="topology-status">{flow.statusLine}</p>
      </div>
    </section>
  );
}
