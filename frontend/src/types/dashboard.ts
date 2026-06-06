import type { LucideIcon } from "lucide-react";

export type PageId =
  | "overview"
  | "training"
  | "upload";

export type Trend = "up" | "down" | "stable";
export type InventoryStatus = "critical" | "warning" | "normal" | "overstock";
export type Priority = "high" | "medium" | "low";
export type ValidationStatus = "passed" | "warning" | "failed";

export type PageDefinition = {
  id: PageId;
  title: string;
  subtitle: string;
  label: string;
  icon: LucideIcon;
};

export type Metric = {
  label: string;
  value: string;
  helper: string;
  sparkline?: number[];
  trend?: Trend;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
};

export type SalesTrendPoint = {
  date: string;
  sales: number | null;
  forecast: number | null;
  revenue: number;
};

export type TopProduct = {
  itemId: string;
  itemName: string;
  category: string;
  sales: number;
  revenue: number;
};

export type ForecastItem = {
  itemId: string;
  itemName: string;
  category: string;
  forecastQty: number;
  forecastDailyQty?: number;
  forecastHorizonDays?: number;
  rollingMean7: number;
  rollingMean28: number;
  wowChangePct: number;
  trend: Trend;
  confidence: number;
};

export type ForecastPoint = {
  date: string;
  actual: number;
  predicted: number;
};

export type ForecastWindow = {
  anchorDate: string;
  startDate: string;
  endDate: string;
  horizonDays: number;
  label: string;
};

export type ForecastDailyPoint = {
  date: string;
  isoDate: string;
  sales?: number | null;
  actualSales?: number | null;
  predictedSales?: number | null;
  forecast?: number | null;
  isPrediction?: boolean;
};

export type ForecastDailySeries = {
  itemId: string;
  itemName: string;
  category: string;
  forecastQty: number;
  forecastHorizonDays: number;
  points: ForecastDailyPoint[];
};

export type InventoryItem = {
  itemId: string;
  itemName: string;
  category: string;
  currentStock: number;
  expectedDailySales: number;
  daysUntilStockout: number | null;
  status: InventoryStatus;
  trend: Trend;
};

export type OrderRecommendation = {
  itemId: string;
  itemName: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
  orderedQty: number;
  recommendedOrderQty: number;
  priority: Priority;
  reason: string;
};

export type ValidationItem = {
  column: string;
  label: string;
  required: boolean;
  status: ValidationStatus;
  message: string;
};

export type CsvIssue = {
  severity: "warning" | "error";
  message: string;
};

export type CsvStatus = {
  state: "empty" | "loaded" | "failed";
  fileName?: string;
  rowCount: number;
  productCount: number;
  dateRange?: string;
  uploadedAt?: string;
  validation: ValidationItem[];
  issues: CsvIssue[];
};

export type DashboardData = {
  source: "empty" | "ai";
  overviewMetrics: Metric[];
  forecastWindow?: ForecastWindow;
  salesTrend: SalesTrendPoint[];
  topProducts: TopProduct[];
  forecastItems: ForecastItem[];
  forecastDailySeries: ForecastDailySeries[];
  forecastSeries: ForecastPoint[];
  inventoryMetrics: Metric[];
  inventoryItems: InventoryItem[];
  orderMetrics: Metric[];
  orderRecommendations: OrderRecommendation[];
};

export type TrainingStatus = {
  status: "idle" | "running" | "done" | "error";
  stage?: "preprocess" | "importance" | "local_training" | "central_register" | "central_download" | "done" | string;
  message: string;
  startedAt?: string | null;
  updatedAt?: string | null;
  clientId?: string | null;
  server?: string | null;
  centralBackend?: string | null;
  latestModelPath?: string | null;
  latestImportancePath?: string | null;
  latestImportance: Array<{
    rank: number;
    feature: string;
    importance: number;
  }>;
  centralSync?: {
    clientId?: string;
    clusterId?: number | null;
    assignedTo?: string | null;
    clusterMembers?: string[];
    similarClients?: Array<{
      clientId: string;
      distance: number;
    }>;
    uploadedModelPath?: string | null;
    flModelPath?: string | null;
    centralFlModelPath?: string | null;
    effectiveModelPath?: string | null;
    centralEffectiveModelPath?: string | null;
  } | null;
};

export type LocalState = {
  flowerServer: string;
  centralBackend: string;
  centralHealth?: {
    ok: boolean;
    statusCode?: number | null;
    payload?: Record<string, unknown> | null;
    message?: string | null;
  };
  runDir: string;
  selectedFeatures: string[];
  modelDirExists: boolean;
  pretrainedModelCount: number;
  localOutputDir: string;
  localModelCount: number;
  syncedModelCount: number;
  latestSyncedModelPath?: string | null;
  latestLocalModelPath?: string | null;
  latestImportancePath?: string | null;
  latestImportance: TrainingStatus["latestImportance"];
  centralSync?: TrainingStatus["centralSync"];
  training: TrainingStatus;
};
