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
  const clamped = Math.max(0, Math.min(max, value));
  const ratio = clamped / max;
  const angle = -120 + ratio * 240;
  const rad = (angle * Math.PI) / 180;
  const cx = 100;
  const cy = 100;
  const r = 72;
  const nx = cx + Math.cos(rad) * (r - 8);
  const ny = cy + Math.sin(rad) * (r - 8);

  return (
    <div className="gauge">
      <svg viewBox="0 0 200 160" className="gauge__svg" aria-hidden>
        <path
          d="M 28 120 A 72 72 0 1 1 172 120"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 28 120 A 72 72 0 1 1 172 120"
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${ratio * 226} 226`}
        />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#0f1724" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="#0f1724" />
      </svg>
      <div className="gauge__value">
        {clamped.toFixed(2)}
        <span>{unit}</span>
      </div>
      <div className="gauge__label">{label}</div>
    </div>
  );
}
