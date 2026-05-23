import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { InventoryStatus, Priority, Trend } from "../types/dashboard";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 1,
    ...options,
  }).format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return sum(values) / values.length;
}

export function getTrendLabel(trend: Trend) {
  return {
    up: "상승",
    down: "하락",
    stable: "안정",
  }[trend];
}

export function getInventoryStatusLabel(status: InventoryStatus) {
  return {
    critical: "품절 위험",
    warning: "주의",
    normal: "정상",
    overstock: "여유 재고",
  }[status];
}

export function getPriorityLabel(priority: Priority) {
  return {
    high: "먼저",
    medium: "다음",
    low: "나중",
  }[priority];
}

export function toDisplayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
