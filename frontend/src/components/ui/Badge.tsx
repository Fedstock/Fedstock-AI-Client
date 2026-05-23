import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils";

type BadgeTone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  primary: "bg-[#EFF6FF] text-[#2563EB]",
  success: "bg-[#ECFDF5] text-[#059669]",
  warning: "bg-[#FFFBEB] text-[#D97706]",
  danger: "bg-[#FEF2F2] text-[#DC2626]",
  info: "bg-slate-100 text-slate-600",
  neutral: "bg-slate-100 text-slate-600",
};

type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  tone?: BadgeTone;
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
