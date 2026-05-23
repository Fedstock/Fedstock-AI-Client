import {
  AlertCircle,
  Calculator,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
} from "lucide-react";
import type {
  CsvStatus,
  DashboardData,
  ForecastItem,
  ForecastPoint,
  InventoryItem,
  OrderRecommendation,
  SalesTrendPoint,
  TopProduct,
} from "../types/dashboard";
import { formatCurrency, formatNumber } from "./utils";

const itemNames = [
  "FOODS_123 Ready Meal",
  "FOODS_208 Fresh Sandwich",
  "FOODS_441 Bottled Coffee",
  "HOUSEHOLD_088 Paper Towels",
  "HOBBIES_017 Craft Kit",
  "FOODS_342 Sparkling Water",
  "HOUSEHOLD_211 Laundry Pack",
  "HOBBIES_092 Board Game",
  "FOODS_518 Frozen Pizza",
  "FOODS_076 Protein Bar",
  "HOUSEHOLD_405 Dish Soap",
  "FOODS_290 Salad Bowl",
];

export const mockCsvStatus: CsvStatus = {
  state: "empty",
  rowCount: 0,
  productCount: 0,
  validation: [],
  issues: [],
};

const topProducts: TopProduct[] = itemNames.slice(0, 8).map((itemName, index) => ({
  itemId: `ITEM_${String(index + 1).padStart(3, "0")}`,
  itemName,
  category: itemName.split("_")[0],
  sales: [642, 589, 552, 498, 441, 410, 377, 352][index],
  revenue: [8346, 7070, 4968, 2988, 6174, 2870, 4524, 5632][index],
}));

const salesTrend: SalesTrendPoint[] = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const sales = Math.round(860 + Math.sin(index / 3) * 95 + index * 7 + (index % 6) * 18);
  const forecast = Math.round(sales * (1.02 + Math.sin(index / 5) * 0.04));
  return {
    date: `05/${String(day).padStart(2, "0")}`,
    sales,
    forecast,
    revenue: Math.round(sales * 12.8),
  };
});

const forecastItems: ForecastItem[] = itemNames.map((itemName, index) => {
  const rollingMean7 = [37.8, 31.4, 28.6, 16.5, 12.3, 26.8, 9.6, 7.4, 21.9, 24.2, 8.1, 17.6][index];
  const rollingMean28 = [32.2, 29.1, 26.2, 18.8, 11.7, 22.5, 10.4, 6.9, 19.4, 20.5, 8.7, 15.1][index];
  const wowChangePct = ((rollingMean7 - rollingMean28) / rollingMean28) * 100;
  return {
    itemId: `ITEM_${String(index + 1).padStart(3, "0")}`,
    itemName,
    category: itemName.split("_")[0],
    forecastQty: Math.max(1, Math.round((rollingMean7 * 0.7 + rollingMean28 * 0.3) * 10) / 10),
    rollingMean7,
    rollingMean28,
    wowChangePct,
    trend: wowChangePct > 8 ? "up" : wowChangePct < -8 ? "down" : "stable",
    confidence: Math.round(82 - Math.abs(wowChangePct) * 0.35 + (index % 3) * 3),
  };
});

const forecastSeries: ForecastPoint[] = Array.from({ length: 20 }, (_, index) => {
  const actual = Math.round(72 + Math.sin(index / 2) * 11 + index * 1.8);
  return {
    date: `05/${String(index + 8).padStart(2, "0")}`,
    actual,
    predicted: Math.round(actual * (1.03 + Math.cos(index / 4) * 0.05)),
  };
});

const inventoryItems: InventoryItem[] = forecastItems.map((item, index) => {
  const currentStock = [82, 64, 33, 125, 96, 41, 180, 74, 38, 52, 215, 44][index];
  const days = item.forecastQty > 0 ? currentStock / item.forecastQty : null;
  const status =
    days === null ? "normal" : days <= 3 ? "critical" : days <= 7 ? "warning" : days > 28 ? "overstock" : "normal";
  return {
    itemId: item.itemId,
    itemName: item.itemName,
    category: item.category,
    currentStock,
    expectedDailySales: item.forecastQty,
    daysUntilStockout: days,
    status,
    trend: item.trend,
  };
});

const orderRecommendations: OrderRecommendation[] = inventoryItems.map((item, index) => {
  const leadTimeDays = [3, 4, 5, 6, 7, 3, 5, 4, 2, 3, 6, 4][index];
  const safetyStock = Math.round(item.expectedDailySales * leadTimeDays * 0.65);
  const reorderPoint = Math.round(item.expectedDailySales * leadTimeDays + safetyStock);
  const orderedQty = [0, 12, 0, 20, 0, 0, 35, 8, 0, 0, 50, 0][index];
  const recommendedOrderQty = Math.max(0, reorderPoint + safetyStock - item.currentStock - orderedQty);
  const priority =
    item.currentStock < safetyStock || (item.daysUntilStockout ?? 999) <= leadTimeDays
      ? "high"
      : item.currentStock < reorderPoint
        ? "medium"
        : "low";
  return {
    itemId: item.itemId,
    itemName: item.itemName,
    category: item.category,
    currentStock: item.currentStock,
    reorderPoint,
    safetyStock,
    leadTimeDays,
    orderedQty,
    recommendedOrderQty,
    priority,
    reason:
      recommendedOrderQty > 0
        ? `현재 재고가 재주문 기준보다 낮고 약 ${item.daysUntilStockout?.toFixed(1) ?? "-"}일 내 소진 예상입니다.`
        : "현재 발주 기준을 충족하고 있어 추가 발주는 낮은 우선순위입니다.",
  };
});

export const mockDashboardData: DashboardData = {
  source: "mock",
  overviewMetrics: [
    {
      label: "오늘 예상 판매량",
      value: `${formatNumber(1084)}개`,
      helper: "지난주보다 8.4% 많음",
      sparkline: [920, 960, 1010, 980, 1040, 1065, 1084],
      trend: "up",
      icon: TrendingUp,
      tone: "primary",
    },
    {
      label: "품절 위험 상품",
      value: "3개",
      helper: "3일 이내 소진 예상",
      sparkline: [5, 4, 4, 3, 4, 3, 3],
      trend: "down",
      icon: Package,
      tone: "danger",
    },
    {
      label: "추천 발주 총량",
      value: `${formatNumber(214)}개`,
      helper: "오늘 발주 필요",
      sparkline: [180, 190, 172, 205, 198, 220, 214],
      icon: ShoppingCart,
      tone: "warning",
    },
    {
      label: "예상 매출",
      value: formatCurrency(13875),
      helper: "평소보다 6.2% 높음",
      sparkline: [12100, 12600, 12980, 12840, 13220, 13680, 13875],
      trend: "up",
      icon: DollarSign,
      tone: "success",
    },
  ],
  salesTrend,
  topProducts,
  forecastSeries,
  inventoryMetrics: [
    { label: "품절 위험 상품", value: `${inventoryItems.filter((item) => item.status === "critical").length}개`, helper: "3일 이내 소진", sparkline: [6, 5, 5, 4, 4, 3, 3], icon: AlertCircle, tone: "danger" },
    { label: "주의 상품", value: `${inventoryItems.filter((item) => item.status === "warning").length}개`, helper: "7일 이내 점검", sparkline: [1, 2, 1, 1, 0, 1, 0], icon: Package, tone: "warning" },
    { label: "정상 상품", value: `${inventoryItems.filter((item) => item.status === "normal").length}개`, helper: "운영 범위 내", sparkline: [4, 4, 5, 5, 5, 5, 5], icon: Package, tone: "success" },
    { label: "여유 재고", value: `${inventoryItems.filter((item) => item.status === "overstock").length}개`, helper: "28일 이상 보유", sparkline: [0, 0, 0, 0, 0, 0, 0], icon: Package, tone: "info" },
  ],
  inventoryItems,
  orderMetrics: [
    { label: "발주 필요 상품", value: `${orderRecommendations.filter((item) => item.recommendedOrderQty > 0).length}개`, helper: "오늘 발주 제안", sparkline: [4, 5, 5, 6, 6, 6, 6], icon: ShoppingCart, tone: "primary" },
    { label: "추천 발주 수량", value: `${formatNumber(orderRecommendations.reduce((total, item) => total + item.recommendedOrderQty, 0))}개`, helper: "오늘 제안 수량", sparkline: [160, 172, 190, 184, 201, 220, 214], icon: Calculator, tone: "warning" },
    { label: "먼저 발주할 상품", value: `${orderRecommendations.filter((item) => item.priority === "high").length}개`, helper: "입고 전에 떨어질 수 있음", sparkline: [2, 3, 4, 4, 5, 5, 5], icon: Truck, tone: "danger" },
    { label: "평균 입고 기간", value: "4.3일", helper: "등록 상품 기준", sparkline: [4.6, 4.4, 4.4, 4.5, 4.3, 4.2, 4.3], icon: Truck, tone: "info" },
  ],
  orderRecommendations,
};
