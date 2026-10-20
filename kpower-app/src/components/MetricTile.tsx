export function MetricTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="metric-tile">
      <div className="metric-tile__label">{label}</div>
      <div className="metric-tile__value">
        {value}
        {unit ? <span className="metric-tile__unit">{unit}</span> : null}
      </div>
    </div>
  );
}
