import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn(
        "motion-card rounded-[24px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition duration-300",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentPropsWithoutRef<"h2">) {
  return <h2 className={cn("text-base font-semibold text-[#1F2937]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentPropsWithoutRef<"p">) {
  return <p className={cn("mt-1 text-sm text-[#6B7280]", className)} {...props} />;
}
