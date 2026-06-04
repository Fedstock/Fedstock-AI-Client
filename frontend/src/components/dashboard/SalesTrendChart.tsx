import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesTrendPoint } from "../../types/dashboard";
import { formatNumber } from "../../lib/utils";
import { ChartTooltip } from "./ChartTooltip";

type SalesTrendChartProps = {
  data: SalesTrendPoint[];
  salesName?: string;
  forecastName?: string;
};

export function SalesTrendChart({
  data,
  salesName = "실제 판매",
  forecastName = "예상 판매",
}: SalesTrendChartProps) {
  const salesValues = data.map((point) => Number(point.sales)).filter(Number.isFinite);
  const allValues = data
    .flatMap((point) => [Number(point.sales), Number(point.forecast)])
    .filter(Number.isFinite);
  const minSales = salesValues.length ? Math.min(...salesValues) : 0;
  const maxSales = salesValues.length ? Math.max(...salesValues) : 0;
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 1;
  const span = Math.max(maxValue - minValue, maxValue * 0.18, 1);
  const domainMin = Math.max(0, Math.floor((minValue - span * 0.24) * 10) / 10);
  const domainMax = Math.ceil((maxValue + span * 0.24) * 10) / 10;

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
          domain={[domainMin, domainMax]}
          tickCount={4}
          tickFormatter={(value) => formatNumber(Number(value))}
        />
        <ReferenceLine
          y={maxSales}
          stroke="#2563EB"
          strokeDasharray="3 5"
          strokeOpacity={0.44}
          label={{
            value: `최대 ${formatNumber(maxSales)}개`,
            position: "insideTopRight",
            fill: "#2563EB",
            fontSize: 12,
            fontWeight: 700,
          }}
        />
        {maxSales !== minSales ? (
          <ReferenceLine
            y={minSales}
            stroke="#F97316"
            strokeDasharray="3 5"
            strokeOpacity={0.5}
            label={{
              value: `최소 ${formatNumber(minSales)}개`,
              position: "insideBottomRight",
              fill: "#EA580C",
              fontSize: 12,
              fontWeight: 700,
            }}
          />
        ) : null}
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
          name={salesName}
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
          name={forecastName}
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
