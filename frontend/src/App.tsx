import { useMemo, useState } from "react";
import {
  Cpu,
  LayoutDashboard,
  Upload,
} from "lucide-react";
import { DashboardShell } from "./components/layout/DashboardShell";
import { CsvUploadPage } from "./pages/CsvUploadPage";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { TrainingPage } from "./pages/TrainingPage";
import { emptyCsvStatus, emptyDashboardData } from "./lib/empty-data";
import type { CsvStatus, DashboardData, PageDefinition, PageId } from "./types/dashboard";

const pages: PageDefinition[] = [
  {
    id: "training",
    label: "CSV 실행",
    title: "CSV 실행",
    subtitle: "판매 이력 CSV 한 번으로 로컬 학습과 다음날 예측을 실행합니다.",
    icon: Cpu,
  },
  {
    id: "upload",
    label: "예측만 실행",
    title: "예측만 실행",
    subtitle: "이미 준비된 로컬 모델로 판매량 예측만 다시 계산합니다.",
    icon: Upload,
  },
  {
    id: "overview",
    label: "판매 예측 결과",
    title: "판매 예측 결과",
    subtitle: "상품별 예상 판매량과 운영 포인트를 확인하세요.",
    icon: LayoutDashboard,
  },
];

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("training");
  const [dashboardData, setDashboardData] = useState<DashboardData>(emptyDashboardData);
  const [csvStatus, setCsvStatus] = useState<CsvStatus>(emptyCsvStatus);
  const [storeId, setStoreId] = useState(() => window.localStorage.getItem("fedstock_store_id") ?? "");

  const headerSummary = useMemo(() => {
    const hasAiResult = dashboardData.source === "ai";

    switch (activePage) {
      case "training":
        return "CSV 한 번으로 로컬 사전학습, noisy importance 생성, 다음날 예측까지 실행하세요.";
      case "upload":
        return hasAiResult
          ? "다음 날짜 판매 예측 결과가 준비됐습니다. 결과 화면에서 확인하세요."
          : "학습 없이 현재 로컬 모델로 마지막 날짜 다음 날의 예상 판매량만 계산합니다.";
      case "overview":
      default:
        return hasAiResult
          ? "상품별 예상 판매량과 수요 흐름을 확인하세요."
          : "CSV 실행에서 판매 이력 파일을 먼저 선택하세요.";
    }
  }, [activePage, dashboardData]);

  const pageContent = useMemo(() => {
    switch (activePage) {
      case "training":
        return (
          <TrainingPage
            onTrainingComplete={(status, data) => {
              setCsvStatus(status);
              setDashboardData(data);
              setActivePage("overview");
            }}
          />
        );
      case "upload":
        return (
          <CsvUploadPage
            csvStatus={csvStatus}
            onCsvLoaded={(status, data) => {
              setCsvStatus(status);
              setDashboardData(data);
              setActivePage("overview");
            }}
          />
        );
      case "overview":
      default:
        return <OverviewPage data={dashboardData} />;
    }
  }, [activePage, csvStatus, dashboardData]);

  if (!storeId) {
    return (
      <LoginPage
        onLogin={(nextStoreId) => {
          window.localStorage.setItem("fedstock_store_id", nextStoreId);
          setStoreId(nextStoreId);
        }}
      />
    );
  }

  return (
    <DashboardShell
      pages={pages}
      activePage={activePage}
      onPageChange={setActivePage}
      dataSource={dashboardData.source}
      headerSummary={headerSummary}
      storeId={storeId}
      onLogout={() => {
        window.localStorage.removeItem("fedstock_store_id");
        setStoreId("");
      }}
    >
      {pageContent}
    </DashboardShell>
  );
}
