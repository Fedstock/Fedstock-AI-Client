import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[rgba(15,23,42,0.08)] px-6 py-10 text-center">
      <div className="mb-4 rounded-2xl bg-[#EFF6FF] p-3 text-[#2563EB]">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-[#1F2937]">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[#6B7280]">{description}</p>
    </div>
  );
}
