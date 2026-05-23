import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ShoppingCart } from "lucide-react";
import { MetricCard } from "../components/dashboard/MetricCard";
import { DataTable } from "../components/dashboard/DataTable";
import { PriorityBadge } from "../components/dashboard/StatusBadge";
import { CardDescription, CardTitle } from "../components/ui/Card";
import { Tabs } from "../components/ui/Tabs";
import type { DashboardData, OrderRecommendation, Priority } from "../types/dashboard";
import { formatNumber } from "../lib/utils";

export function OrderRecommendationPage({ data }: { data: DashboardData }) {
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const filteredOrders = useMemo(
    () =>
      data.orderRecommendations
        .filter((item) => item.recommendedOrderQty > 0)
        .filter((item) => priorityFilter === "all" || item.priority === priorityFilter),
    [data.orderRecommendations, priorityFilter],
  );
  const priorityCards = useMemo(
    () =>
      [...data.orderRecommendations]
        .filter((item) => item.recommendedOrderQty > 0)
        .sort((a, b) => {
          const score = { high: 3, medium: 2, low: 1 };
          return score[b.priority] - score[a.priority] || b.recommendedOrderQty - a.recommendedOrderQty;
        })
        .slice(0, 4),
    [data.orderRecommendations],
  );

  const columns = useMemo<ColumnDef<OrderRecommendation>[]>(
    () => [
      {
        accessorKey: "itemName",
        header: "상품",
        cell: ({ row }) => (
          <div>
            <p className="max-w-[220px] truncate font-medium text-[#1F2937]" title={row.original.itemName}>
              {row.original.itemName}
            </p>
            <p className="text-xs text-[#9CA3AF]">{row.original.category}</p>
          </div>
        ),
      },
      { accessorKey: "currentStock", header: "현재 보유", cell: ({ getValue }) => `${formatNumber(Number(getValue()))}개` },
      { accessorKey: "reorderPoint", header: "발주 기준", cell: ({ getValue }) => `${formatNumber(Number(getValue()))}개` },
      { accessorKey: "safetyStock", header: "남겨둘 재고", cell: ({ getValue }) => `${formatNumber(Number(getValue()))}개` },
      { accessorKey: "leadTimeDays", header: "입고 기간", cell: ({ getValue }) => `${formatNumber(Number(getValue()))}일` },
      { accessorKey: "orderedQty", header: "입고 예정", cell: ({ getValue }) => `${formatNumber(Number(getValue()))}개` },
      {
        accessorKey: "recommendedOrderQty",
        header: "발주 추천",
        cell: ({ getValue }) => <span className="font-semibold text-[#111827]">{formatNumber(Number(getValue()))}개</span>,
      },
      {
        accessorKey: "priority",
        header: "확인 순서",
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
    ],
    [],
  );

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.orderMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <DataTable
        data={filteredOrders}
        columns={columns}
        title="상품별 발주 추천"
        description="발주가 필요한 상품만 보여줍니다."
        searchPlaceholder="상품 검색"
        toolbar={
          <Tabs
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: "all", label: "전체" },
              { value: "high", label: "높음" },
              { value: "medium", label: "중간" },
              { value: "low", label: "낮음" },
            ]}
          />
        }
      />
    </div>
  );
}
