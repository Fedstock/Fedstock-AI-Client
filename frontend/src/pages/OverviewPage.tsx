import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  DollarSign,
  PackageCheck,
  PackageOpen,
  ShoppingCart,
  TrendingUp,
  Truck,
} from "lucide-react";
import { SalesTrendChart } from "../components/dashboard/SalesTrendChart";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import type { DashboardData, Metric } from "../types/dashboard";
import { average, formatCurrency, formatNumber } from "../lib/utils";

type SummaryCard = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone: string;
};

function CompactMetricCard({ metric }: { metric: SummaryCard }) {
  const Icon = metric.icon;

  return (
    <Card className="rounded-[18px] p-4 shadow-[0_10px_28px_rgb(15,23,42,0.035)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-400">{metric.label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{metric.value}</p>
          {metric.helper ? <p className="mt-2 truncate text-xs text-slate-400">{metric.helper}</p> : null}
        </div>
        <div className={`rounded-2xl p-2.5 ${metric.tone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
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

export function OverviewPage({ data }: { data: DashboardData }) {
  const latestTrendPoint = data.salesTrend[data.salesTrend.length - 1];
  const latestSales = latestTrendPoint?.forecast ?? latestTrendPoint?.sales ?? 0;
  const latestRevenue = latestTrendPoint?.revenue ?? 0;
  const criticalInventoryCount = data.inventoryItems.filter((item) => item.status === "critical").length;
  const normalInventoryCount = data.inventoryItems.filter((item) => item.status === "normal").length;
  const orderItems = data.orderRecommendations.filter((item) => item.recommendedOrderQty > 0);
  const recommendedOrderTotal = orderItems.reduce((total, item) => total + item.recommendedOrderQty, 0);
  const averageLeadTime = average(data.orderRecommendations.map((item) => item.leadTimeDays));

  const computedSummaryCards: SummaryCard[] = [
    {
      label: data.source === "ai" ? "AI 예상 판매량" : "오늘 예상 판매량",
      value: `${formatNumber(latestSales)}개`,
      helper: data.source === "ai" ? "PA-CFL LSTM 추론" : "최근 흐름 기준",
      icon: TrendingUp,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "품절 위험 상품",
      value: `${criticalInventoryCount}개`,
      helper: "3일 이내 소진 예상",
      icon: AlertCircle,
      tone: "bg-red-50 text-red-500",
    },
    {
      label: "추천 발주 총량",
      value: `${formatNumber(recommendedOrderTotal)}개`,
      helper: "오늘 발주 필요",
      icon: ShoppingCart,
      tone: "bg-amber-50 text-amber-500",
    },
    {
      label: "예상 매출",
      value: formatCurrency(latestRevenue),
      helper: "오늘 판매 기준",
      icon: DollarSign,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "정상 재고",
      value: `${normalInventoryCount}개`,
      helper: "운영 범위 내",
      icon: PackageCheck,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "발주 추천 상품",
      value: `${orderItems.length}개`,
      helper: "수량 확인 필요",
      icon: PackageOpen,
      tone: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "평균 입고 기간",
      value: `${formatNumber(averageLeadTime)}일`,
      helper: "등록 상품 기준",
      icon: Truck,
      tone: "bg-slate-50 text-slate-500",
    },
  ];
  const summaryCards: SummaryCard[] =
    data.source === "ai" && data.overviewMetrics.length
      ? data.overviewMetrics.map((metric) => ({
          label: metric.label,
          value: metric.value,
          helper: metric.helper,
          icon: metric.icon,
          tone: metricToneClass(metric.tone),
        }))
      : computedSummaryCards;
  const topForecastItems = [...data.topProducts].slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((metric) => (
          <CompactMetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="p-6 pb-2">
          <CardHeader className="mb-0">
            <div>
              <CardTitle>판매 그래프</CardTitle>
              <CardDescription>최근 실제 판매와 앞으로의 예상 판매를 비교합니다.</CardDescription>
            </div>
          </CardHeader>
        </div>
        <div className="px-6 pb-6">
          <SalesTrendChart data={data.salesTrend} />
        </div>
      </Card>

      {data.source === "ai" && topForecastItems.length ? (
        <Card className="p-6">
          <CardHeader>
            <div>
              <CardTitle>AI 상품별 예상 판매량</CardTitle>
              <CardDescription>업로드한 CSV를 PA-CFL LSTM 모델로 추론한 상품별 예상 판매량입니다.</CardDescription>
            </div>
          </CardHeader>
          <div className="mt-2 divide-y divide-gray-100">
            {topForecastItems.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900" title={item.itemName}>
                    {item.itemName}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-400">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold tracking-tight text-blue-600">{formatNumber(item.sales)}개</p>
                  <p className="mt-1 text-xs text-slate-400">예상 판매량</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
