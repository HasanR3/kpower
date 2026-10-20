import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type VoltagePoint = { t: number; vin: number; vout: number };

export function VoltageChart({ points }: { points: VoltagePoint[] }) {
  const data = points.map((p, i) => ({
    ...p,
    label: i === 0 || i === points.length - 1 ? new Date(p.t).toLocaleTimeString() : "",
  }));

  return (
    <div className="voltage-panel">
      <div className="mimic-panel__head">
        <h2>Voltage trend</h2>
        <span className="panel__tag">Last 60 samples · volts</span>
      </div>
      <div className="voltage-chart" aria-label="Input and output voltage">
        {points.length < 2 ? (
          <p className="panel__empty">Collecting voltage samples…</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#e6ebf1" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis
                domain={["auto", "auto"]}
                width={44}
                tick={{ fill: "#7a8796", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                unit=" V"
              />
              <Tooltip
                labelFormatter={(value) => new Date(Number(value)).toLocaleTimeString()}
                formatter={(value, name) => [
                  `${Number(value).toFixed(1)} V`,
                  name === "vin" ? "Voltage in" : "Voltage out",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #d8dee6",
                  boxShadow: "none",
                }}
              />
              <Legend
                verticalAlign="top"
                height={28}
                formatter={(value) => (value === "vin" ? "Voltage in" : "Voltage out")}
              />
              <Line
                type="monotone"
                dataKey="vin"
                name="vin"
                stroke="#1d4ed8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="vout"
                name="vout"
                stroke="#0f7a45"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
