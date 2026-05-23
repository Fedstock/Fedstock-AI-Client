import { cn } from "../../lib/utils";

type ProgressProps = {
  value: number;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
};

const toneClasses = {
  primary: "bg-[#2563EB]",
  success: "bg-[#059669]",
  warning: "bg-[#D97706]",
  danger: "bg-[#DC2626]",
  info: "bg-slate-500",
  neutral: "bg-slate-400",
};

export function Progress({ value, tone = "primary", className }: ProgressProps) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full rounded-full transition-all", toneClasses[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
