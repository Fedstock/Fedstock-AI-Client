import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/10",
        className,
      )}
      {...props}
    />
  );
}
