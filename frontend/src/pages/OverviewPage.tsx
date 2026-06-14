import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Check,
  ChevronDown,
  CloudSun,
  Package,
  TrendingUp,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SalesTrendChart } from "../components/dashboard/SalesTrendChart";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import type { DashboardData, ForecastDailySeries, ForecastItem, Metric } from "../types/dashboard";
import { fetchWeatherInsight, type WeatherInsight } from "../lib/weather-insight";
import { formatNumber } from "../lib/utils";

type SummaryCard = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone: string;
};

const forecastBluePalette = [
  "#1D4ED8",
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#0EA5E9",
  "#0284C7",
  "#1E40AF",
  "#1E3A8A",
  "#93C5FD",
  "#BAE6FD",
];

function CompactMetricCard({ metric }: { metric: SummaryCard }) {
  const Icon = metric.icon;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-400">{metric.label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{metric.value}</p>
          {metric.helper ? <p className="mt-2 truncate text-xs font-semibold text-slate-400">{metric.helper}</p> : null}
        </div>
        <div className={`rounded-2xl p-3 ${metric.tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}

function metricToneClass(tone: Metric["tone"]) {
  return {
    primary: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-500",
    danger: "bg-red-50 text-red-500",
    info: "bg-sky-50 text-sky-600",
    neutral: "bg-slate-50 text-slate-500",
  }[tone ?? "neutral"];
}

function toChartNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function displayCategory(category: string) {
  const raw = category.split("·").pop()?.trim() ?? category;
  return raw || "상품군 미확인";
}

function metricToSummaryCard(metric: Metric): SummaryCard {
  return {
    label: metric.label,
    value: metric.value,
    helper: metric.helper,
    icon: metric.icon,
    tone: metricToneClass(metric.tone),
  };
}

function buildForecastSummaryCards(data: DashboardData, forecastWindowLabel?: string): SummaryCard[] {
  const forecastMetric = data.overviewMetrics.find((metric) => /예상 판매량|AI 예상/.test(metric.label));
  const revenueMetric = data.overviewMetrics.find((metric) => /매출/.test(metric.label));
  const topItem = data.forecastItems[0];

  return [
    forecastMetric
      ? metricToSummaryCard(forecastMetric)
      : {
          label: "다음날 AI 예상 판매량",
          value: "0개",
          helper: forecastWindowLabel ?? "예측 대기",
          icon: TrendingUp,
          tone: metricToneClass("primary"),
        },
    {
      label: "분석 상품 수",
      value: `${formatNumber(data.forecastItems.length)}개`,
      helper: forecastWindowLabel ?? "상품별 예측 완료",
      icon: Package,
      tone: metricToneClass("info"),
    },
    {
      label: "최고 예측 상품",
      value: topItem ? `${formatNumber(topItem.forecastQty)}개` : "-",
      helper: topItem?.itemName ?? "상품 데이터 없음",
      icon: BarChart3,
      tone: metricToneClass("warning"),
    },
    revenueMetric
      ? metricToSummaryCard(revenueMetric)
      : {
          label: "예상 매출",
          value: "-",
          helper: "예측 판매량 × 판매가",
          icon: TrendingUp,
          tone: metricToneClass("success"),
        },
  ];
}

function ForecastSeriesSelect({
  items,
  selectedSeries,
  onChange,
}: {
  items: ForecastDailySeries[];
  selectedSeries: ForecastDailySeries;
  onChange: (itemId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="flex min-h-[68px] w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_12px_30px_rgba(15,23,42,0.07)] transition hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(37,99,235,0.12)] focus:outline-none focus:ring-4 focus:ring-blue-100"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-blue-950" title={selectedSeries.itemName}>
            {selectedSeries.itemName}
          </p>
          <p className="mt-1.5 text-xs font-semibold text-slate-400">
            다음날 예측 {formatNumber(selectedSeries.forecastQty)}개 · 전체 {items.length}개 상품
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-blue-700 transition ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-30 mt-2 max-h-[320px] w-full overflow-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
          {items.map((series) => {
            const isSelected = series.itemId === selectedSeries.itemId;
            return (
              <button
                key={series.itemId}
                type="button"
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  isSelected ? "bg-blue-50 text-blue-950" : "text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => {
                  onChange(series.itemId);
                  setIsOpen(false);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{series.itemName}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                    다음날 예측 {formatNumber(series.forecastQty)}개
                  </span>
                </span>
                {isSelected ? <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ForecastDistribution({
  items,
  forecastWindowLabel,
}: {
  items: ForecastItem[];
  forecastWindowLabel?: string;
}) {
  const topItems = items.slice(0, 8);
  const maxQty = Math.max(...topItems.map((item) => item.forecastQty), 1);
  const categoryMix = Object.values(
    items.reduce<Record<string, { category: string; qty: number }>>((acc, item) => {
      const category = displayCategory(item.category);
      if (!acc[category]) acc[category] = { category, qty: 0 };
      acc[category].qty += item.forecastQty;
      return acc;
    }, {}),
  ).sort((a, b) => b.qty - a.qty);
  const categoryTotal = categoryMix.reduce((sum, item) => sum + item.qty, 0);
  let conicStart = 0;
  const donutBackground = categoryMix.length
    ? `conic-gradient(${categoryMix
      .map((item, index) => {
        const share = categoryTotal ? item.qty / categoryTotal * 100 : 0;
        const start = conicStart;
        conicStart += share;
        return `${forecastBluePalette[index % forecastBluePalette.length]} ${start}% ${conicStart}%`;
      })
      .join(", ")})`
    : "#E2E8F0";

  return (
    <Card className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.055)] lg:p-7">
      <CardHeader className="mb-6">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">상위 판매 예상 상품</CardTitle>
          <CardDescription className="mt-1.5 text-sm leading-6 text-slate-500">
            {forecastWindowLabel ? `${forecastWindowLabel} 동안 많이 팔릴 것으로 보이는 상품을 그래프로 정리했습니다.` : "많이 팔릴 것으로 보이는 상품을 그래프로 정리했습니다."}
          </CardDescription>
        </div>
      </CardHeader>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="divide-y divide-slate-100">
          {topItems.map((item, index) => {
            const percent = Math.max(3, Math.min(100, (item.forecastQty / maxQty) * 100));
            const category = displayCategory(item.category);
            const color = forecastBluePalette[index % forecastBluePalette.length];

            return (
              <div key={item.itemId} className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[190px_minmax(0,1fr)_74px] sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-blue-500">
                      {index + 1}
                    </span>
                    <p className="truncate text-sm font-bold text-slate-950" title={item.itemName}>
                      {item.itemName}
                    </p>
                  </div>
                  <p className="mt-1 pl-8 text-xs font-medium text-slate-400">{category}</p>
                </div>
                <div className="h-2.5 min-w-0 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <p className="text-right text-sm font-bold text-slate-950">{formatNumber(item.forecastQty)}개</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="mb-4">
            <p className="text-sm font-bold text-slate-900">상품군 구성</p>
            <p className="mt-1 text-xs text-slate-400">예상 판매량 기준</p>
          </div>
          <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full" style={{ background: donutBackground }}>
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white">
              <span className="text-[11px] font-semibold text-slate-400">상품군</span>
              <span className="mt-0.5 text-lg font-bold text-slate-950">{categoryMix.length}개</span>
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            {categoryMix.slice(0, 4).map((item, index) => (
              <div key={item.category} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-600">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: forecastBluePalette[index % forecastBluePalette.length] }} />
                  <span className="truncate">{item.category}</span>
                </span>
                <span className="shrink-0 font-bold text-slate-900">{formatNumber(categoryTotal ? item.qty / categoryTotal * 100 : 0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function WeatherInsightBanner({ insight }: { insight: WeatherInsight }) {
  const focusItems = insight.checklist.slice(0, 2).join(", ");
  const insightText = focusItems
    ? `오늘 같은 날씨에는 ${focusItems}의 수요 증가가 예상됩니다.`
    : insight.message;

  return (
    <Card className="border border-blue-100 bg-blue-50/80 p-6 shadow-[0_10px_28px_rgb(37,99,235,0.08)]">
      <div className="flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
          <CloudSun className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-blue-950">오늘의 날씨 참고</p>
          <p className="mt-1 text-sm font-semibold text-blue-900">
            {insight.location} · {insight.condition} · {insight.temperature}
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-700">{insight.message}</p>
          <p className="text-sm leading-6 text-slate-800">
            {insightText} 날씨에 따른 운영 참고용 안내입니다.
          </p>
        </div>
      </div>
    </Card>
  );
}

function FlowChangeChart({ items }: { items: ForecastItem[] }) {
  const chartData = items
    .filter((item) => Number.isFinite(item.wowChangePct))
    .sort((a, b) => Math.abs(b.wowChangePct) - Math.abs(a.wowChangePct))
    .slice(0, 10)
    .map((item) => ({
      name: item.itemName,
      value: item.wowChangePct,
    }));

  if (!chartData.length) return null;

  return (
    <Card className="p-6">
      <CardHeader>
        <div>
          <CardTitle>최근 판매 흐름 변화율</CardTitle>
          <CardDescription>
            최근 1주 판매 흐름이 최근 4주 평균과 비교해 얼마나 달라졌는지 보여줍니다.
          </CardDescription>
        </div>
      </CardHeader>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 34, left: 6, bottom: 8 }}
        >
          <CartesianGrid horizontal={false} stroke="#EEF2F7" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94A3B8", fontSize: 12 }}
            tickFormatter={(value) => `${formatNumber(Number(value))}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={132}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748B", fontSize: 12, fontWeight: 600 }}
          />
          <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1.5} />
          <Tooltip
            cursor={{ fill: "#F8FAFC" }}
            formatter={(value) => [`${formatNumber(Number(value))}%`, "변화율"]}
            labelStyle={{ color: "#0F172A", fontWeight: 700 }}
            contentStyle={{
              border: "1px solid #E2E8F0",
              borderRadius: 16,
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
            }}
          />
          <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={18}>
            {chartData.map((item) => (
              <Cell key={item.name} fill={item.value >= 0 ? "#2563EB" : "#F97316"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function OverviewPage({ data }: { data: DashboardData }) {
  const forecastDailySeries = data.forecastDailySeries ?? [];
  const [selectedItemId, setSelectedItemId] = useState("");
  const [weatherInsight, setWeatherInsight] = useState<WeatherInsight | null>(null);
  const selectedSeries = useMemo(
    () => forecastDailySeries.find((series) => series.itemId === selectedItemId) ?? forecastDailySeries[0],
    [forecastDailySeries, selectedItemId],
  );
  const selectedChartData = useMemo(() => {
    if (!selectedSeries) return [];
    const isLegacySingleForecast = selectedSeries.forecastHorizonDays === 1 && selectedSeries.points.length === 1;

    return selectedSeries.points.map((point) => {
      const predictedSales = toChartNumber(
        point.predictedSales
        ?? point.forecast
        ?? ((point.isPrediction || isLegacySingleForecast) ? point.sales : null),
      );
      const actualSales = toChartNumber(
        point.actualSales
        ?? ((!point.isPrediction && !isLegacySingleForecast) ? point.sales : null),
      );

      return {
        date: point.date,
        sales: actualSales,
        forecast: predictedSales,
        revenue: 0,
      };
    });
  }, [selectedSeries]);

  useEffect(() => {
    if (data.source !== "ai") {
      setWeatherInsight(null);
      return;
    }

    const controller = new AbortController();
    void fetchWeatherInsight(controller.signal)
      .then(setWeatherInsight)
      .catch(() => setWeatherInsight(null));

    return () => controller.abort();
  }, [data.source]);

  if (data.source === "empty") {
    return (
      <div className="mx-auto w-full max-w-[1320px]">
        <EmptyState
          icon={Upload}
          title="판매 이력 파일이 필요합니다"
          description="판매 예측 실행에서 판매 이력 CSV를 선택하면 예측 결과가 표시됩니다."
        />
      </div>
    );
  }

  const forecastWindow = data.forecastWindow;
  const summaryCards = buildForecastSummaryCards(data, forecastWindow?.label);

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      {weatherInsight ? <WeatherInsightBanner insight={weatherInsight} /> : null}

      {summaryCards.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((metric) => (
            <CompactMetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      ) : null}

      {data.source === "ai" && selectedSeries ? (
        <Card className="overflow-hidden p-0">
          <div className="px-6 pb-4 pt-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <CardTitle>판매 예측 그래프</CardTitle>
                <CardDescription>
                  최근 실제 판매량과 다음 날짜 AI 예측 판매량을 같은 그래프에서 확인합니다.
                </CardDescription>
              </div>
              <div className="w-full xl:w-[320px]">
                <ForecastSeriesSelect
                  items={forecastDailySeries}
                  selectedSeries={selectedSeries}
                  onChange={setSelectedItemId}
                />
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <SalesTrendChart
              data={selectedChartData}
              salesName="기존 판매량"
              forecastName="AI 예측량"
            />
          </div>
        </Card>
      ) : null}

      {data.source === "ai" && data.forecastItems.length ? (
        <FlowChangeChart items={data.forecastItems} />
      ) : null}

      {data.source === "ai" && data.forecastItems.length ? (
        <ForecastDistribution items={data.forecastItems} forecastWindowLabel={forecastWindow?.label} />
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="표시할 판매 예측 결과가 없습니다"
          description="CSV를 다시 업로드하거나 잠시 후 다시 시도하세요."
        />
      )}
    </div>
  );
}
