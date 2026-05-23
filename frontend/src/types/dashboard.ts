import type { LucideIcon } from "lucide-react";

export type PageId =
  | "overview"
  | "upload"
  | "inventory"
  | "orders";

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
  sales: number;
  forecast: number;
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
  source: "mock" | "ai";
  overviewMetrics: Metric[];
  salesTrend: SalesTrendPoint[];
  topProducts: TopProduct[];
  forecastSeries: ForecastPoint[];
  inventoryMetrics: Metric[];
  inventoryItems: InventoryItem[];
  orderMetrics: Metric[];
  orderRecommendations: OrderRecommendation[];
};
