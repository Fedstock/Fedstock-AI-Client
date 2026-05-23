import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { MetricCard } from "../components/dashboard/MetricCard";
import { DataTable } from "../components/dashboard/DataTable";
import { StatusBadge } from "../components/dashboard/StatusBadge";
import { Progress } from "../components/ui/Progress";
import { Tabs } from "../components/ui/Tabs";
import type { DashboardData, InventoryItem, InventoryStatus } from "../types/dashboard";
import { formatNumber } from "../lib/utils";

function stockTone(status: InventoryStatus) {
  if (status === "critical") return "danger";
  if (status === "warning") return "warning";
  if (status === "normal") return "success";
  return "info";
}

export function InventoryPage({ data }: { data: DashboardData }) {
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all");
  const filteredItems = useMemo(
    () => data.inventoryItems.filter((item) => statusFilter === "all" || item.status === statusFilter),
    [data.inventoryItems, statusFilter],
  );

  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      {
        accessorKey: "itemName",
        header: "상품",
        cell: ({ row }) => (
          <div className="min-w-[240px]">
            <p className="truncate font-medium text-[#1F2937]" title={row.original.itemName}>
              {row.original.itemName}
            </p>
            <p className="text-xs text-[#9CA3AF]">{row.original.category}</p>
          </div>
        ),
      },
      { accessorKey: "currentStock", header: "현재 보유", cell: ({ getValue }) => `${formatNumber(Number(getValue()))}개` },
      { accessorKey: "expectedDailySales", header: "하루 예상 판매", cell: ({ getValue }) => `${formatNumber(Number(getValue()))}개` },
      {
        accessorKey: "daysUntilStockout",
        header: "남은 기간",
        cell: ({ row }) => (row.original.daysUntilStockout === null ? "판매 없음" : `약 ${formatNumber(row.original.daysUntilStockout)}일`),
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "stockLevel",
        header: "재고 여유",
        cell: ({ row }) => (
          <div className="w-32">
            <Progress
              value={row.original.status === "overstock" ? 100 : Math.min(100, ((row.original.daysUntilStockout ?? 0) / 28) * 100)}
              tone={stockTone(row.original.status)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.inventoryMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <DataTable
        data={filteredItems}
        columns={columns}
        title="상품별 재고 상태"
        description="품절 위험은 3일 이내, 주의는 7일 이내, 여유 재고는 28일 이상 남은 상품입니다."
        searchPlaceholder="상품 검색"
        toolbar={
          <Tabs
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "전체" },
              { value: "critical", label: "위험" },
              { value: "warning", label: "주의" },
              { value: "normal", label: "정상" },
              { value: "overstock", label: "여유" },
            ]}
          />
        }
      />
    </div>
  );
}
