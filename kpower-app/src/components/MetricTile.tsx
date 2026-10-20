import type { LucideIcon } from "lucide-react";

export function MetricTile({
  label,
  value,
  unit,
  Icon,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  Icon?: LucideIcon;
  hint?: string;
}) {
  return (
    <article className="metric-tile">
      <div className="metric-tile__top">
        {Icon ? <Icon className="metric-tile__icon" aria-hidden size={16} strokeWidth={2} /> : null}
        <div className="metric-tile__label">{label}</div>
      </div>
      <div className="metric-tile__value">
        {value}
        {unit ? <span className="metric-tile__unit">{unit}</span> : null}
      </div>
      {hint ? <div className="metric-tile__hint">{hint}</div> : null}
    </article>
  );
}
