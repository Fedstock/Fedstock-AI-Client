import {
  AlertCircle,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { centralApiClient, localApiClient } from "../api/client";
import { getApiErrorMessage } from "../api/errors";
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

type HealthResponse = Record<string, unknown>;

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

function toApiError(error: unknown, fallbackMessage: string) {
  return new Error(getApiErrorMessage(error, fallbackMessage));
}

export async function analyzeCsvWithAi(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data: payload } = await localApiClient.post<AnalyzeCsvResponse>("/analyze-csv", formData);
    return {
      status: payload.status,
      data: hydrateDashboardData(payload.data),
    };
  } catch (error) {
    throw toApiError(error, "파일을 분석하지 못했습니다.");
  }
}

export async function startTrainingWithAi(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await localApiClient.post<{ status: string; server: string }>("/start-training", formData);
    return data;
  } catch (error) {
    throw toApiError(error, "학습을 시작하지 못했습니다.");
  }
}

export async function syncFlModelWithAi() {
  try {
    const { data } = await localApiClient.post<{ status: string; message?: string }>("/sync-fl-model");
    return data;
  } catch (error) {
    throw toApiError(error, "FL 모델 동기화를 시작하지 못했습니다.");
  }
}

export async function fetchTrainingStatus() {
  try {
    const { data } = await localApiClient.get<TrainingStatus>("/training-status");
    return data;
  } catch (error) {
    throw toApiError(error, "학습 상태를 불러오지 못했습니다.");
  }
}

export async function fetchLocalState() {
  try {
    const { data } = await localApiClient.get<LocalState>("/local-state");
    return data;
  } catch (error) {
    throw toApiError(error, "로컬 상태를 불러오지 못했습니다.");
  }
}

export async function fetchLocalHealth() {
  try {
    const { data } = await localApiClient.get<HealthResponse>("/health");
    return data;
  } catch (error) {
    throw toApiError(error, "로컬 exe 상태를 확인하지 못했습니다.");
  }
}

export async function fetchCentralHealth() {
  try {
    const { data } = await centralApiClient.get<HealthResponse>("/health");
    return data;
  } catch (error) {
    throw toApiError(error, "중앙 서버 상태를 확인하지 못했습니다.");
  }
}
