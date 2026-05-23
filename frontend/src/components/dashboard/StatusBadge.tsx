import type { InventoryStatus, Priority } from "../../types/dashboard";
import { Badge } from "../ui/Badge";
import { getInventoryStatusLabel, getPriorityLabel } from "../../lib/utils";

export function StatusBadge({ status }: { status: InventoryStatus }) {
  const tone = status === "critical" ? "danger" : status === "warning" ? "warning" : status === "normal" ? "success" : "info";
  return <Badge tone={tone}>{getInventoryStatusLabel(status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const tone = priority === "high" ? "danger" : priority === "medium" ? "warning" : "neutral";
  return <Badge tone={tone}>{getPriorityLabel(priority)}</Badge>;
}
