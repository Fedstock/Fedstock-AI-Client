import type { CsvStatus, DashboardData } from "../types/dashboard";

export const emptyCsvStatus: CsvStatus = {
  state: "empty",
  rowCount: 0,
  productCount: 0,
  validation: [],
  issues: [],
};

export const emptyDashboardData: DashboardData = {
  source: "empty",
  overviewMetrics: [],
  salesTrend: [],
  topProducts: [],
  forecastItems: [],
  forecastDailySeries: [],
  forecastSeries: [],
  inventoryMetrics: [],
  inventoryItems: [],
  orderMetrics: [],
  orderRecommendations: [],
};
