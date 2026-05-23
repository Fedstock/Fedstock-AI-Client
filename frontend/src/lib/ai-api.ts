import {
  AlertCircle,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { CsvStatus, DashboardData, Metric } from "../types/dashboard";

type ApiMetric = Omit<Metric, "icon"> & {
  iconKey?: keyof typeof iconMap;
};

type ApiDashboardData = Omit<DashboardData, "overviewMetrics" | "inventoryMetrics" | "orderMetrics"> & {
  overviewMetrics: ApiMetric[];
  inventoryMetrics: ApiMetric[];
  orderMetrics: ApiMetric[];
};

type AnalyzeCsvResponse = {
  status: CsvStatus;
  data: ApiDashboardData;
};

const iconMap = {
  AlertCircle,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
} satisfies Record<string, LucideIcon>;

const fallbackIcon = Package;

function hydrateMetrics(metrics: ApiMetric[]): Metric[] {
  return metrics.map((metric) => ({
    ...metric,
    icon: metric.iconKey ? iconMap[metric.iconKey] ?? fallbackIcon : fallbackIcon,
  }));
}

function hydrateDashboardData(data: ApiDashboardData): DashboardData {
  return {
    ...data,
    overviewMetrics: hydrateMetrics(data.overviewMetrics),
    inventoryMetrics: hydrateMetrics(data.inventoryMetrics),
    orderMetrics: hydrateMetrics(data.orderMetrics),
  };
}

function getApiBaseUrl() {
  return import.meta.env.VITE_AI_API_URL ?? "http://localhost:8000";
}

function extractErrorMessage(payload: unknown) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "AI 서버 분석에 실패했습니다.";

  const detail = "detail" in payload ? (payload as { detail?: unknown }).detail : undefined;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  if ("message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "AI 서버 분석에 실패했습니다.";
}

export async function analyzeCsvWithAi(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${getApiBaseUrl()}/analyze-csv`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = await response.text();
    }
    throw new Error(extractErrorMessage(payload));
  }

  const payload = (await response.json()) as AnalyzeCsvResponse;
  return {
    status: payload.status,
    data: hydrateDashboardData(payload.data),
  };
}
