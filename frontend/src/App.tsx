import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Upload,
} from "lucide-react";
import { DashboardShell } from "./components/layout/DashboardShell";
import { CsvUploadPage } from "./pages/CsvUploadPage";
import { OverviewPage } from "./pages/OverviewPage";
import { InventoryPage } from "./pages/InventoryPage";
import { OrderRecommendationPage } from "./pages/OrderRecommendationPage";
import { mockCsvStatus, mockDashboardData } from "./lib/mock-data";
import type { CsvStatus, DashboardData, PageDefinition, PageId } from "./types/dashboard";

const pages: PageDefinition[] = [
  {
    id: "overview",
    label: "오늘 요약",
    title: "오늘 요약",
    subtitle: "품절 위험 상품과 발주 추천을 먼저 확인하세요.",
    icon: LayoutDashboard,
  },
  {
    id: "upload",
    label: "자료 올리기",
    title: "자료 올리기",
    subtitle: "판매·재고 자료를 올리면 화면이 바로 바뀝니다.",
    icon: Upload,
  },
  {
    id: "inventory",
    label: "재고 점검",
    title: "재고 점검",
    subtitle: "남은 기간이 짧은 상품부터 확인하세요.",
    icon: Package,
  },
  {
    id: "orders",
    label: "발주 추천",
    title: "발주 추천",
    subtitle: "오늘 발주할 상품과 수량을 확인하세요.",
    icon: ShoppingCart,
  },
];

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [dashboardData, setDashboardData] = useState<DashboardData>(mockDashboardData);
  const [csvStatus, setCsvStatus] = useState<CsvStatus>(mockCsvStatus);

  const headerSummary = useMemo(() => {
    const criticalCount = dashboardData.inventoryItems.filter((item) => item.status === "critical").length;
    const orderCount = dashboardData.orderRecommendations.filter((item) => item.recommendedOrderQty > 0).length;

    switch (activePage) {
      case "upload":
        return dashboardData.source === "ai"
            ? "AI 모델 분석 결과가 반영됐습니다. 재고 점검과 발주 추천을 확인하세요."
            : "판매·재고 자료를 올리면 로컬 AI 모델로 분석합니다.";
      case "inventory":
        return `품절 위험 ${criticalCount}개를 먼저 확인하고, 여유 재고는 뒤로 미뤄도 됩니다.`;
      case "orders":
        return `발주 추천 ${orderCount}개 중 우선순위가 높은 상품부터 처리하세요.`;
      case "overview":
      default:
        return `품절 위험 ${criticalCount}개와 발주 추천 ${orderCount}개를 먼저 확인하세요.`;
    }
  }, [activePage, dashboardData]);

  const pageContent = useMemo(() => {
    switch (activePage) {
      case "upload":
        return (
          <CsvUploadPage
            csvStatus={csvStatus}
            onCsvLoaded={(status, data) => {
              setCsvStatus(status);
              setDashboardData(data);
            }}
          />
        );
      case "inventory":
        return <InventoryPage data={dashboardData} />;
      case "orders":
        return <OrderRecommendationPage data={dashboardData} />;
      case "overview":
      default:
        return <OverviewPage data={dashboardData} />;
    }
  }, [activePage, csvStatus, dashboardData]);

  return (
    <DashboardShell
      pages={pages}
      activePage={activePage}
      onPageChange={setActivePage}
      dataSource={dashboardData.source}
      headerSummary={headerSummary}
    >
      {pageContent}
    </DashboardShell>
  );
}
