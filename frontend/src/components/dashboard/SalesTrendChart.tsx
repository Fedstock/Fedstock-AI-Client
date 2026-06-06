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

type EnhancedSalesTrendPoint = SalesTrendPoint & {
  forecastBridge?: number | null;
  showForecastBridgeTooltip?: boolean;
};

export function SalesTrendChart({
  data,
  salesName = "실제 판매",
  forecastName = "예상 판매",
}: SalesTrendChartProps) {
  const toFiniteNumber = (value: number | null | undefined) => (
    typeof value === "number" && Number.isFinite(value) ? value : null
  );
  const salesValues = data
    .map((point) => toFiniteNumber(point.sales))
    .filter((value): value is number => value !== null);
  const allValues = data
    .flatMap((point) => [toFiniteNumber(point.sales), toFiniteNumber(point.forecast)])
    .filter((value): value is number => value !== null);
  const lastSalesIndex = data.reduce(
    (latestIndex, point, index) => (toFiniteNumber(point.sales) !== null ? index : latestIndex),
    -1,
  );
  const forecastIndex = data.findIndex(
    (point, index) => index > lastSalesIndex && toFiniteNumber(point.forecast) !== null,
  );
  const chartData: EnhancedSalesTrendPoint[] = data.map((point, index) => {
    const sales = toFiniteNumber(point.sales);
    const forecast = toFiniteNumber(point.forecast);
    const forecastBridge =
      index === lastSalesIndex
        ? sales
        : index === forecastIndex
          ? forecast
          : null;

    return {
      ...point,
      forecastBridge,
      showForecastBridgeTooltip: index === forecastIndex,
    };
  });
  const minSales = salesValues.length ? Math.min(...salesValues) : 0;
  const maxSales = salesValues.length ? Math.max(...salesValues) : 0;
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 1;
  const span = Math.max(maxValue - minValue, maxValue * 0.18, 1);
  const domainMin = Math.max(0, Math.floor((minValue - span * 0.24) * 10) / 10);
  const domainMax = Math.ceil((maxValue + span * 0.24) * 10) / 10;
  const ForecastDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: EnhancedSalesTrendPoint }) => {
    if (!payload?.showForecastBridgeTooltip || cx == null || cy == null) return <g />;
    return <circle cx={cx} cy={cy} r={4.5} fill="#FFFFFF" stroke="#10B981" strokeWidth={2.5} />;
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={chartData} margin={{ top: 26, right: 18, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.22} />
            <stop offset="55%" stopColor="#3B82F6" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="forecastTrendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.24} />
            <stop offset="55%" stopColor="#10B981" stopOpacity={0.09} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
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
        {salesValues.length ? (
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
        ) : null}
        {salesValues.length && maxSales !== minSales ? (
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
              payloadFilter={(item) => (
                item.dataKey !== "forecastBridge" || item.payload?.showForecastBridgeTooltip === true
              )}
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
          connectNulls={false}
          activeDot={{ r: 5, strokeWidth: 3, fill: "#FFFFFF", stroke: "#3B82F6" }}
          isAnimationActive
        />
        <Area
          type="monotone"
          dataKey="forecastBridge"
          name={forecastName}
          stroke="#10B981"
          fill="url(#forecastTrendGradient)"
          fillOpacity={1}
          strokeOpacity={0.95}
          strokeWidth={2.5}
          dot={ForecastDot}
          connectNulls={false}
          activeDot={{ r: 5, strokeWidth: 3, fill: "#FFFFFF", stroke: "#10B981" }}
          isAnimationActive
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
