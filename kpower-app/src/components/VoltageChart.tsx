import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export type VoltagePoint = { t: number; vin: number; vout: number };

export function VoltageChart({ points }: { points: VoltagePoint[] }) {
  return (
    <div className="voltage-chart" aria-label="Input and output voltage">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="t" hide />
          <YAxis domain={["auto", "auto"]} width={40} tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="vin" name="Vin" stroke="var(--accent)" dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="vout" name="Vout" stroke="var(--ok)" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
