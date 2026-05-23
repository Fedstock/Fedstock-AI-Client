import type { Metric } from "../../types/dashboard";
import { Card } from "../ui/Card";
import { TrendBadge } from "./TrendBadge";
import { cn } from "../../lib/utils";

const toneClasses = {
  primary: "bg-blue-50 text-blue-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  info: "bg-sky-50 text-sky-600",
  neutral: "bg-slate-50 text-slate-500",
};

export function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const tone = metric.tone ?? "neutral";

  return (
    <Card className="rounded-[18px] p-4 shadow-[0_10px_28px_rgb(15,23,42,0.035)] hover:shadow-[0_12px_36px_rgb(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-400">{metric.label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{metric.value}</p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-400">
            {metric.trend ? <TrendBadge trend={metric.trend} /> : null}
            <span className="min-w-0 truncate">{metric.helper}</span>
          </div>
        </div>
        <div className={cn("rounded-2xl p-2.5", toneClasses[tone])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}
