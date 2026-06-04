import {
  AlertCircle,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { CsvStatus, DashboardData, LocalState, Metric, TrainingStatus } from "../types/dashboard";

type ApiMetric = Omit<Metric, "icon"> & {
  iconKey?: keyof typeof iconMap;
};

type ApiDashboardData = Omit<DashboardData, "overviewMetrics" | "inventoryMetrics" | "orderMetrics" | "forecastItems" | "forecastDailySeries"> & {
  overviewMetrics: ApiMetric[];
  inventoryMetrics: ApiMetric[];
  orderMetrics: ApiMetric[];
  forecastItems?: DashboardData["forecastItems"];
  forecastDailySeries?: DashboardData["forecastDailySeries"];
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
    forecastItems: data.forecastItems ?? [],
    forecastDailySeries: data.forecastDailySeries ?? [],
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
  if (!payload || typeof payload !== "object") return "파일을 분석하지 못했습니다.";

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
  return "파일을 분석하지 못했습니다.";
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

export async function startTrainingWithAi(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${getApiBaseUrl()}/start-training`, {
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

  return (await response.json()) as { status: string; server: string };
}

export async function fetchTrainingStatus() {
  const response = await fetch(`${getApiBaseUrl()}/training-status`);
  if (!response.ok) {
    throw new Error("학습 상태를 불러오지 못했습니다.");
  }
  return (await response.json()) as TrainingStatus;
}

export async function fetchLocalState() {
  const response = await fetch(`${getApiBaseUrl()}/local-state`);
  if (!response.ok) {
    throw new Error("로컬 상태를 불러오지 못했습니다.");
  }
  return (await response.json()) as LocalState;
}
