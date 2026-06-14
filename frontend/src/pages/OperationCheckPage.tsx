import {
  BarChart3,
  CheckCircle2,
  ListChecks,
  Package,
  TrendingUp,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SalesTrendChart } from "../components/dashboard/SalesTrendChart";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import type { DashboardData, ForecastItem } from "../types/dashboard";
import { formatNumber } from "../lib/utils";

const chartPalette = ["#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#6366F1", "#14B8A6", "#60A5FA", "#93C5FD"];

function displayCategory(category: string) {
  const raw = category.split("·").pop()?.trim() ?? category;
  return raw || "상품군 미확인";
}

function toChartNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function changeLabel(item?: ForecastItem) {
  if (!item || !Number.isFinite(item.wowChangePct)) return "변화율 확인";
  const sign = item.wowChangePct > 0 ? "+" : "";
  return `${sign}${formatNumber(item.wowChangePct)}%`;
}

export function OperationCheckPage({ data }: { data: DashboardData }) {
  if (data.source === "empty" || !data.forecastItems.length) {
    return (
      <div className="mx-auto w-full max-w-[1320px]">
        <EmptyState
          icon={Upload}
          title="운영 체크에 필요한 예측 결과가 없습니다"
          description="판매 예측 실행에서 판매 이력 CSV를 먼저 선택하세요."
        />
      </div>
    );
  }

  const forecastWindowLabel = data.forecastWindow?.label ?? "다음날 예측";
  const forecastItems = [...data.forecastItems].sort((a, b) => b.forecastQty - a.forecastQty);
  const topForecastItems = forecastItems.slice(0, 5);
  const topItem = topForecastItems[0];
  const changedItems = [...forecastItems]
    .filter((item) => Number.isFinite(item.wowChangePct))
    .sort((a, b) => Math.abs(b.wowChangePct) - Math.abs(a.wowChangePct))
    .slice(0, 5);
  const fastestChangeItem = changedItems[0];
  const lineSeries =
    data.forecastDailySeries.find((series) => series.itemId === topItem?.itemId)
    ?? data.forecastDailySeries[0];
  const lineChartData = lineSeries?.points.map((point) => {
    const predictedSales = toChartNumber(
      point.predictedSales
      ?? point.forecast
      ?? (point.isPrediction ? point.sales : null),
    );
    const actualSales = toChartNumber(
      point.actualSales
      ?? (!point.isPrediction ? point.sales : null),
    );

    return {
      date: point.date,
      sales: actualSales,
      forecast: predictedSales,
      revenue: 0,
    };
  }) ?? [];
  const topForecastTotal = topForecastItems.reduce((sum, item) => sum + item.forecastQty, 0);
  const forecastTotal = forecastItems.reduce((sum, item) => sum + item.forecastQty, 0);
  const categoryData = Object.values(
    forecastItems.reduce<Record<string, { name: string; value: number }>>((acc, item) => {
      const category = displayCategory(item.category);
      if (!acc[category]) acc[category] = { name: category, value: 0 };
      acc[category].value += item.forecastQty;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const barData = topForecastItems.map((item) => ({
    name: item.itemName,
    forecastQty: item.forecastQty,
    change: item.wowChangePct,
  }));
  const actionItems = [
    topItem
      ? {
          key: "top",
          icon: TrendingUp,
          tone: "bg-blue-50 text-blue-600",
          title: `${topItem.itemName} 판매 위치 확인`,
          detail: `${forecastWindowLabel} ${formatNumber(topItem.forecastQty)}개 예상`,
        }
      : null,
    fastestChangeItem
      ? {
          key: "change",
          icon: BarChart3,
          tone: fastestChangeItem.wowChangePct >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600",
          title: `${fastestChangeItem.itemName} 판매 흐름 점검`,
          detail: `최근 1주 흐름이 4주 평균 대비 ${changeLabel(fastestChangeItem)}입니다.`,
        }
      : null,
    lineSeries
      ? {
          key: "trend",
          icon: ListChecks,
          tone: "bg-slate-100 text-slate-600",
          title: `${lineSeries.itemName} 그래프 확인`,
          detail: "최근 실제 판매량과 다음날 예측값을 함께 확인합니다.",
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">분석 상품</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">{formatNumber(forecastItems.length)}개</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">CSV 판매 이력 기준</p>
            </div>
            <span className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              <Package className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">예상 판매 총량</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">{formatNumber(forecastTotal)}개</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">{forecastWindowLabel}</p>
            </div>
            <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">상위 5개 예상량</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-950">{formatNumber(topForecastTotal)}개</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">판매 집중 상품</p>
            </div>
            <span className="rounded-2xl bg-sky-50 p-3 text-sky-600">
              <BarChart3 className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">예측 기준일</p>
              <p className="mt-2 text-lg font-extrabold text-slate-950">{data.forecastWindow?.anchorDate ?? "-"}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">CSV 마지막 날짜 다음날</p>
            </div>
            <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </Card>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
        <Card className="p-7">
          <CardHeader className="mb-8">
            <div>
              <CardTitle>판매 흐름과 내일 예측</CardTitle>
              <CardDescription>
                {lineSeries ? `${lineSeries.itemName}의 최근 판매량과 ${forecastWindowLabel}을 함께 봅니다.` : "최근 판매량과 다음 예측을 함께 봅니다."}
              </CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <SalesTrendChart
            data={lineChartData}
            salesName="최근 판매량"
            forecastName="내일 예측"
            height={420}
          />
        </Card>

        <Card className="p-7">
          <CardHeader className="mb-7">
            <div>
              <CardTitle>상품군별 예상 판매량</CardTitle>
              <CardDescription>CSV 상품 분류를 기준으로 예측 판매량을 묶었습니다.</CardDescription>
            </div>
            <Package className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <div className="grid gap-6 sm:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-1">
            <div className="relative h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={3}
                    stroke="#FFFFFF"
                    strokeWidth={4}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${formatNumber(Number(value))}개`, name]}
                    contentStyle={{
                      border: "1px solid #E2E8F0",
                      borderRadius: 14,
                      boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-slate-400">상품군</span>
                <span className="mt-1 text-2xl font-extrabold text-slate-950">{formatNumber(categoryData.length)}개</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartPalette[index % chartPalette.length] }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="text-sm font-extrabold text-slate-950">{formatNumber(item.value)}개</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-7">
        <CardHeader className="mb-8">
          <div>
            <CardTitle>상위 예상 판매량</CardTitle>
            <CardDescription>다음날 많이 팔릴 것으로 예측된 상품을 수량 기준으로 비교합니다.</CardDescription>
          </div>
          <BarChart3 className="h-5 w-5 text-slate-400" aria-hidden="true" />
        </CardHeader>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={barData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="#EEF2F7" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748B", fontSize: 12, fontWeight: 700 }}
              interval={0}
              tickMargin={10}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#94A3B8", fontSize: 12 }}
              tickFormatter={(value) => formatNumber(Number(value))}
              width={52}
            />
            <Tooltip
              cursor={{ fill: "#F8FAFC" }}
              formatter={(value) => [`${formatNumber(Number(value))}개`, "예상 판매량"]}
              contentStyle={{
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
              }}
            />
            <Bar dataKey="forecastQty" name="예상 판매량" fill="#2563EB" radius={[10, 10, 0, 0]} barSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="p-6">
          <CardHeader className="mb-5">
            <div>
              <CardTitle>오늘 먼저 확인</CardTitle>
              <CardDescription>판매 예측 결과 기준으로 바로 확인할 항목입니다.</CardDescription>
            </div>
            <ListChecks className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <div className="space-y-3">
            {actionItems.map((item) => {
              if (!item) return null;
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.035)]">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader className="mb-5">
            <div>
              <CardTitle>판매 흐름 변화 상품</CardTitle>
              <CardDescription>최근 1주 평균이 4주 평균과 크게 달라진 상품입니다.</CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {changedItems.map((item, index) => (
              <div key={item.itemId} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-extrabold text-blue-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{item.itemName}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{displayCategory(item.category)}</p>
                  </div>
                </div>
                <p className={`shrink-0 text-sm font-extrabold ${item.wowChangePct >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                  {changeLabel(item)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
