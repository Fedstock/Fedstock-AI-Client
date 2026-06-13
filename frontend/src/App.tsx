import { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  LayoutDashboard,
  Upload,
} from "lucide-react";
import { fetchCurrentUser, logout } from "./api/auth";
import { getAccessToken } from "./api/token";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
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
    label: "판매 예측 실행",
    title: "판매 예측 실행",
    subtitle: "판매 이력 CSV 한 번으로 다음 날짜 예상 판매량을 계산합니다.",
    icon: Cpu,
  },
  {
    id: "upload",
    label: "다시 계산",
    title: "다시 계산",
    subtitle: "판매 이력 파일로 예측 결과만 다시 계산합니다.",
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

const STORE_ID_KEY = "fedstock_store_id";

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("training");
  const [dashboardData, setDashboardData] = useState<DashboardData>(emptyDashboardData);
  const [csvStatus, setCsvStatus] = useState<CsvStatus>(emptyCsvStatus);
  const [accessToken, setAccessTokenState] = useState(() => getAccessToken());
  const [storeId, setStoreId] = useState(() => window.localStorage.getItem(STORE_ID_KEY) ?? "");
  const isAuthenticated = Boolean(accessToken);

  useEffect(() => {
    if (!isAuthenticated && window.location.pathname !== "/login") {
      window.history.replaceState(null, "", "/login");
    }

    if (isAuthenticated && window.location.pathname === "/login") {
      window.history.replaceState(null, "", "/");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    fetchCurrentUser()
      .then((user) => {
        if (cancelled) return;
        const nextStoreId = user.name ?? user.storeId ?? user.email;
        if (!nextStoreId) return;
        window.localStorage.setItem(STORE_ID_KEY, nextStoreId);
        setStoreId(nextStoreId);
      })
      .catch(() => {
        // The response interceptor handles expired sessions. Display can keep the stored id.
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const headerSummary = useMemo(() => {
    const hasAiResult = dashboardData.source === "ai";

    switch (activePage) {
      case "training":
        return "판매 이력 파일을 올리면 다음 날짜 예상 판매량을 바로 확인할 수 있습니다.";
      case "upload":
        return hasAiResult
          ? "다음 날짜 판매 예측 결과가 준비됐습니다. 결과 화면에서 확인하세요."
          : "판매 이력 파일로 다음 날짜 예상 판매량을 다시 계산합니다.";
      case "overview":
      default:
        return hasAiResult
          ? "상품별 예상 판매량과 수요 흐름을 확인하세요."
          : "판매 예측 실행에서 판매 이력 파일을 먼저 선택하세요.";
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

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLogin={(nextStoreId) => {
          window.localStorage.setItem(STORE_ID_KEY, nextStoreId);
          setStoreId(nextStoreId);
          setAccessTokenState(getAccessToken());
          window.history.replaceState(null, "", "/");
        }}
      />
    );
  }

  return (
    <ProtectedRoute>
      <DashboardShell
        pages={pages}
        activePage={activePage}
        onPageChange={setActivePage}
        dataSource={dashboardData.source}
        headerSummary={headerSummary}
        storeId={storeId}
        onLogout={() => {
          window.localStorage.removeItem(STORE_ID_KEY);
          setStoreId("");
          setAccessTokenState(null);
          logout();
        }}
      >
        {pageContent}
      </DashboardShell>
    </ProtectedRoute>
  );
}
