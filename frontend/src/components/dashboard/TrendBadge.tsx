import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Trend } from "../../types/dashboard";
import { Badge } from "../ui/Badge";
import { getTrendLabel } from "../../lib/utils";

export function TrendBadge({ trend }: { trend: Trend }) {
  const Icon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : ArrowRight;
  const tone = trend === "up" ? "success" : trend === "down" ? "danger" : "neutral";
  return (
    <Badge tone={tone}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {getTrendLabel(trend)}
    </Badge>
  );
}
