/**
 * Instrument-style gauge — 240° sweep (automotive / SCADA).
 * 0% at lower-left, 100% at lower-right, apex at top.
 * SVG angles: 0° = right, clockwise, y-down.
 */
const CX = 120;
const CY = 118;
const R = 88;
const START_DEG = 150; // lower-left
const SWEEP_DEG = 240; // through top to lower-right

export type GaugeVariant = "load" | "battery";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function clampRatio(value: number, max: number): number {
  if (!Number.isFinite(value) || max <= 0) return 0;
  return Math.max(0, Math.min(1, value / max));
}

function pointOnArc(ratio: number, radius = R): { x: number; y: number } {
  const deg = START_DEG + SWEEP_DEG * Math.max(0, Math.min(1, ratio));
  const rad = degToRad(deg);
  return {
    x: CX + Math.cos(rad) * radius,
    y: CY + Math.sin(rad) * radius,
  };
}

function arcPath(radius: number, from = 0, to = 1): string {
  const start = pointOnArc(from, radius);
  const end = pointOnArc(to, radius);
  const sweep = Math.abs(to - from) * SWEEP_DEG;
  const large = sweep > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function needlePolygon(ratio: number): string {
  const tip = pointOnArc(ratio, R - 14);
  const deg = START_DEG + SWEEP_DEG * ratio;
  const rad = degToRad(deg);
  // Perpendicular for blade width
  const px = Math.cos(rad + Math.PI / 2);
  const py = Math.sin(rad + Math.PI / 2);
  const base = pointOnArc(ratio, 14);
  const wTip = 1.6;
  const wBase = 5.5;
  return [
    `${tip.x + px * wTip},${tip.y + py * wTip}`,
    `${tip.x - px * wTip},${tip.y - py * wTip}`,
    `${base.x - px * wBase},${base.y - py * wBase}`,
    `${base.x + px * wBase},${base.y + py * wBase}`,
  ].join(" ");
}

function zoneClass(variant: GaugeVariant, ratio: number): string {
  if (variant === "load") {
    if (ratio >= 0.85) return "gauge--crit";
    if (ratio >= 0.6) return "gauge--warn";
    return "gauge--ok";
  }
  // battery: high is healthy
  if (ratio <= 0.2) return "gauge--crit";
  if (ratio <= 0.4) return "gauge--warn";
  return "gauge--ok";
}

function statusCopy(variant: GaugeVariant, ratio: number): string {
  if (variant === "load") {
    if (ratio >= 0.85) return "Overload risk";
    if (ratio >= 0.6) return "Elevated load";
    if (ratio <= 0.05) return "Idle";
    return "Nominal load";
  }
  if (ratio <= 0.2) return "Critical reserve";
  if (ratio <= 0.4) return "Low reserve";
  if (ratio >= 0.95) return "Fully charged";
  return "Healthy reserve";
}

export function GaugeDial({
  label,
  value,
  max = 100,
  unit = "%",
  variant = "load",
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  variant?: GaugeVariant;
}) {
  const clamped = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
  const ratio = clampRatio(clamped, max);
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10);
  const uid = `g-${variant}-${label.replace(/\s+/g, "")}`;

  return (
    <article className={`gauge ${zoneClass(variant, ratio)}`} data-variant={variant}>
      <header className="gauge__head">
        <h3 className="gauge__title">{label}</h3>
        <span className="gauge__badge">{statusCopy(variant, ratio)}</span>
      </header>

      <div className="gauge__face">
        <svg
          viewBox="0 0 240 200"
          className="gauge__svg"
          role="img"
          aria-label={`${label}: ${clamped.toFixed(1)}${unit}`}
        >
          <defs>
            <linearGradient id={`${uid}-fill`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className="gauge-stop-a" />
              <stop offset="55%" className="gauge-stop-b" />
              <stop offset="100%" className="gauge-stop-c" />
            </linearGradient>
            <linearGradient id={`${uid}-bezel`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <radialGradient id={`${uid}-glass`} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0f1724" stopOpacity="0.06" />
            </radialGradient>
            <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#0f1724" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Outer bezel */}
          <circle cx={CX} cy={CY} r={R + 18} fill={`url(#${uid}-bezel)`} className="gauge__bezel" />
          <circle cx={CX} cy={CY} r={R + 14} className="gauge__bezel-inner" />
          <circle cx={CX} cy={CY} r={R + 10} fill={`url(#${uid}-glass)`} />

          {/* Track */}
          <path
            d={arcPath(R)}
            fill="none"
            className="gauge__track"
            strokeWidth="14"
            strokeLinecap="round"
            pathLength={100}
          />

          {/* Zone underlays (subtle) */}
          {variant === "load" ? (
            <>
              <path d={arcPath(R, 0, 0.6)} className="gauge__zone gauge__zone--ok" strokeWidth="14" fill="none" strokeLinecap="butt" pathLength={100} />
              <path d={arcPath(R, 0.6, 0.85)} className="gauge__zone gauge__zone--warn" strokeWidth="14" fill="none" strokeLinecap="butt" pathLength={100} />
              <path d={arcPath(R, 0.85, 1)} className="gauge__zone gauge__zone--crit" strokeWidth="14" fill="none" strokeLinecap="butt" pathLength={100} />
            </>
          ) : (
            <>
              <path d={arcPath(R, 0, 0.2)} className="gauge__zone gauge__zone--crit" strokeWidth="14" fill="none" strokeLinecap="butt" pathLength={100} />
              <path d={arcPath(R, 0.2, 0.4)} className="gauge__zone gauge__zone--warn" strokeWidth="14" fill="none" strokeLinecap="butt" pathLength={100} />
              <path d={arcPath(R, 0.4, 1)} className="gauge__zone gauge__zone--ok" strokeWidth="14" fill="none" strokeLinecap="butt" pathLength={100} />
            </>
          )}

          {/* Active fill */}
          <path
            d={arcPath(R)}
            fill="none"
            stroke={`url(#${uid}-fill)`}
            className="gauge__fill"
            strokeWidth="14"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${ratio * 100} 100`}
          />

          {/* Scale ticks + labels */}
          {ticks.map((t) => {
            const major = (t * 10) % 2 === 0;
            const outer = pointOnArc(t, R - 8);
            const inner = pointOnArc(t, major ? R - 22 : R - 16);
            const labelPt = pointOnArc(t, R - 32);
            return (
              <g key={t}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  className={major ? "gauge__tick gauge__tick--major" : "gauge__tick"}
                  strokeLinecap="round"
                />
                {major ? (
                  <text
                    x={labelPt.x}
                    y={labelPt.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="gauge__tick-label"
                  >
                    {Math.round(t * max)}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* Needle */}
          <polygon
            points={needlePolygon(ratio)}
            className="gauge__needle"
            filter={`url(#${uid}-soft)`}
          />
          <circle cx={CX} cy={CY} r="11" className="gauge__hub-ring" />
          <circle cx={CX} cy={CY} r="7" className="gauge__hub" />
          <circle cx={CX} cy={CY} r="2.5" className="gauge__hub-core" />

          {/* Center readout */}
          <text x={CX} y={CY + 36} textAnchor="middle" className="gauge__value-svg">
            {clamped.toFixed(1)}
            <tspan className="gauge__unit-svg">{unit}</tspan>
          </text>
        </svg>
      </div>

      <footer className="gauge__foot">
        <span className="gauge__scale">0{unit}</span>
        <span className="gauge__scale gauge__scale--mid">{Math.round(max / 2)}{unit}</span>
        <span className="gauge__scale">{max}{unit}</span>
      </footer>
    </article>
  );
}
