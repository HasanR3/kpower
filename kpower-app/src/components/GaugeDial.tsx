/**
 * Semi-circular gauge (open bottom).
 * 0% = left, 50% = top, 100% = right.
 * SVG angles: 0° right, 90° down, 180° left, 270° up — clockwise.
 */
const CX = 100;
const CY = 108;
const R = 72;
const TRACK = 12;
const START_DEG = 180; // left
const SWEEP_DEG = 180; // through top to right

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Point on the arc at value ratio 0..1 */
function pointOnArc(ratio: number, radius = R): { x: number; y: number } {
  const deg = START_DEG + SWEEP_DEG * Math.max(0, Math.min(1, ratio));
  const rad = degToRad(deg);
  return {
    x: CX + Math.cos(rad) * radius,
    y: CY + Math.sin(rad) * radius,
  };
}

function arcPath(radius: number): string {
  const start = pointOnArc(0, radius);
  const end = pointOnArc(1, radius);
  // sweep=1 (clockwise) from left → through top → right
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function GaugeDial({
  label,
  value,
  max = 100,
  unit = "%",
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
}) {
  const clamped = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
  const ratio = max > 0 ? clamped / max : 0;
  const tip = pointOnArc(ratio, R - 10);

  const tone =
    ratio >= 0.9 ? "gauge--high" : ratio >= 0.6 ? "gauge--mid" : ratio > 0 ? "gauge--low" : "gauge--empty";

  return (
    <div className={`gauge ${tone}`}>
      <svg viewBox="0 0 200 155" className="gauge__svg" role="img" aria-label={`${label}: ${clamped.toFixed(1)}${unit}`}>
        <path
          d={arcPath(R)}
          fill="none"
          stroke="currentColor"
          className="gauge__track"
          strokeWidth={TRACK}
          strokeLinecap="round"
          pathLength={100}
        />
        <path
          d={arcPath(R)}
          fill="none"
          stroke="currentColor"
          className="gauge__fill"
          strokeWidth={TRACK}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${ratio * 100} 100`}
        />
        {[0, 0.5, 1].map((t) => {
          const outer = pointOnArc(t, R + 2);
          const inner = pointOnArc(t, R - TRACK / 2 - 4);
          return (
            <line
              key={t}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              className="gauge__tick"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        <line
          x1={CX}
          y1={CY}
          x2={tip.x}
          y2={tip.y}
          className="gauge__needle"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r="7" className="gauge__hub" />
        <circle cx={CX} cy={CY} r="3" className="gauge__hub-core" />
      </svg>
      <div className="gauge__value">
        {clamped.toFixed(2)}
        <span>{unit}</span>
      </div>
      <div className="gauge__label">{label}</div>
    </div>
  );
}
