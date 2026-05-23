import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:opacity-60",
        variant === "primary" && "bg-[#2563EB] text-white hover:bg-[#1D4ED8]",
        variant === "outline" && "border border-[rgba(15,23,42,0.08)] bg-white text-[#111827] hover:border-[#2563EB]/30",
        variant === "ghost" && "text-[#6B7280] hover:bg-white hover:text-[#111827]",
        size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4 text-sm",
        className,
      )}
      {...props}
    />
  );
}
