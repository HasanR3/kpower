/**
 * Premium ops instrument — flat 240° arc, tabular readout, LED status.
 * No skeuomorphic bezel / glass / soft pills.
 */
const CX = 120;
const CY = 118;
const R = 88;
const START_DEG = 150;
const SWEEP_DEG = 240;

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
  const tip = pointOnArc(ratio, R - 12);
  const deg = START_DEG + SWEEP_DEG * ratio;
  const rad = degToRad(deg);
  const px = Math.cos(rad + Math.PI / 2);
  const py = Math.sin(rad + Math.PI / 2);
  const base = pointOnArc(ratio, 18);
  const wTip = 1.2;
  const wBase = 3.5;
  return [
    `${tip.x + px * wTip},${tip.y + py * wTip}`,
    `${tip.x - px * wTip},${tip.y - py * wTip}`,
    `${base.x - px * wBase},${base.y - py * wBase}`,
    `${base.x + px * wBase},${base.y + py * wBase}`,
  ].join(" ");
}

function zoneClass(variant: GaugeVariant, ratio: number): string {
  if (variant === "load") {
    if (ratio >= 0.9) return "gauge--crit";
    if (ratio >= 0.8) return "gauge--warn";
    return "gauge--ok";
  }
  if (ratio <= 0.15) return "gauge--crit";
  if (ratio <= 0.3) return "gauge--warn";
  return "gauge--ok";
}

function statusCode(variant: GaugeVariant, ratio: number): string {
  if (variant === "load") {
    if (ratio >= 0.9) return "OL";
    if (ratio >= 0.8) return "HIGH";
    if (ratio <= 0.05) return "IDLE";
    return "NOM";
  }
  if (ratio <= 0.15) return "CRIT";
  if (ratio <= 0.3) return "LOW";
  if (ratio >= 0.95) return "FULL";
  return "OK";
}

function statusCopy(variant: GaugeVariant, ratio: number): string {
  if (variant === "load") {
    if (ratio >= 0.9) return "Overload risk";
    if (ratio >= 0.8) return "Elevated load";
    if (ratio <= 0.05) return "Idle";
    return "Nominal load";
  }
  if (ratio <= 0.15) return "Critical reserve";
  if (ratio <= 0.3) return "Low reserve";
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
  const code = statusCode(variant, ratio);

  return (
    <article className={`gauge ${zoneClass(variant, ratio)}`} data-variant={variant}>
      <header className="gauge__head">
        <div>
          <p className="gauge__channel">{variant === "load" ? "CH-LOAD" : "CH-BATT"}</p>
          <h3 className="gauge__title">{label}</h3>
        </div>
        <div className="gauge__led" title={statusCopy(variant, ratio)}>
          <span className="gauge__led-dot" aria-hidden />
          <span className="gauge__led-code">{code}</span>
        </div>
      </header>

      <div className="gauge__face">
        <svg
          viewBox="0 0 240 200"
          className="gauge__svg"
          role="img"
          aria-label={`${label}: ${clamped.toFixed(1)}${unit}`}
        >
          {/* Permanent zone bands */}
          {variant === "load" ? (
            <>
              <path d={arcPath(R, 0, 0.8)} className="gauge__zone gauge__zone--ok" strokeWidth="10" fill="none" strokeLinecap="butt" />
              <path d={arcPath(R, 0.8, 0.9)} className="gauge__zone gauge__zone--warn" strokeWidth="10" fill="none" strokeLinecap="butt" />
              <path d={arcPath(R, 0.9, 1)} className="gauge__zone gauge__zone--crit" strokeWidth="10" fill="none" strokeLinecap="butt" />
            </>
          ) : (
            <>
              <path d={arcPath(R, 0, 0.15)} className="gauge__zone gauge__zone--crit" strokeWidth="10" fill="none" strokeLinecap="butt" />
              <path d={arcPath(R, 0.15, 0.3)} className="gauge__zone gauge__zone--warn" strokeWidth="10" fill="none" strokeLinecap="butt" />
              <path d={arcPath(R, 0.3, 1)} className="gauge__zone gauge__zone--ok" strokeWidth="10" fill="none" strokeLinecap="butt" />
            </>
          )}

          <path d={arcPath(R)} fill="none" className="gauge__track" strokeWidth="2" strokeLinecap="butt" />

          {/* Active position marker */}
          <path
            d={arcPath(R)}
            fill="none"
            className="gauge__fill"
            strokeWidth="3"
            strokeLinecap="butt"
            pathLength={100}
            strokeDasharray={`${ratio * 100} 100`}
          />

          {ticks.map((t) => {
            const major = (t * 10) % 2 === 0;
            const outer = pointOnArc(t, R - 2);
            const inner = pointOnArc(t, major ? R - 14 : R - 8);
            const labelPt = pointOnArc(t, R - 26);
            return (
              <g key={t}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  className={major ? "gauge__tick gauge__tick--major" : "gauge__tick"}
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

          <polygon points={needlePolygon(ratio)} className="gauge__needle" />
          <circle cx={CX} cy={CY} r="5" className="gauge__hub" />
        </svg>
      </div>

      <div className="gauge__readout" aria-hidden>
        <span className="gauge__value">{clamped.toFixed(1)}</span>
        <span className="gauge__unit">{unit}</span>
      </div>
      <p className="gauge__status-line">{statusCopy(variant, ratio)}</p>
    </article>
  );
}
