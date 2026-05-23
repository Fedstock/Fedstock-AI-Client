import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesTrendPoint } from "../../types/dashboard";
import { formatNumber } from "../../lib/utils";
import { ChartTooltip } from "./ChartTooltip";

export function SalesTrendChart({ data }: { data: SalesTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 26, right: 18, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.22} />
            <stop offset="55%" stopColor="#3B82F6" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="forecastTrendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CBD5E1" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#CBD5E1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#EEF2F7" strokeWidth={1} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#A8B1C1", fontSize: 12 }}
          minTickGap={42}
          dy={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#A8B1C1", fontSize: 12 }}
          width={50}
          domain={["dataMin - 80", "dataMax + 80"]}
          tickCount={4}
          tickFormatter={(value) => formatNumber(Number(value))}
        />
        <Tooltip
          cursor={{ stroke: "#CBD5E1", strokeWidth: 1, strokeDasharray: "4 4" }}
          content={
            <ChartTooltip
              valueFormatter={(value) => `${formatNumber(Number(value))}개`}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="sales"
          name="실제 판매"
          stroke="#3B82F6"
          fill="url(#colorSales)"
          fillOpacity={1}
          strokeWidth={2.25}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 3, fill: "#FFFFFF", stroke: "#3B82F6" }}
          isAnimationActive
        />
        <Area
          type="monotone"
          dataKey="forecast"
          name="예상 판매"
          stroke="#94A3B8"
          fill="url(#forecastTrendGradient)"
          fillOpacity={1}
          strokeOpacity={0.62}
          strokeWidth={2}
          strokeDasharray="4 6"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, fill: "#FFFFFF", stroke: "#94A3B8" }}
          isAnimationActive
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
