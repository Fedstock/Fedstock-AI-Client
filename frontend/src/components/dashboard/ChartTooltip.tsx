import { formatNumber } from "../../lib/utils";

type TooltipPayload = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
  valueFormatter?: (value: number | string, name?: string, dataKey?: string) => string;
  labelFormatter?: (label?: string) => string;
};

export function ChartTooltip({
  active,
  label,
  payload,
  valueFormatter,
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs shadow-[0_14px_36px_rgba(15,23,42,0.12)]">
      {label ? <p className="mb-2 font-medium text-[#111827]">{labelFormatter ? labelFormatter(label) : label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={`${item.dataKey ?? item.name}`} className="flex min-w-[144px] items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-[#6B7280]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? "#94A3B8" }} />
              {item.name}
            </span>
            <span className="font-semibold text-[#111827]">
              {valueFormatter
                ? valueFormatter(item.value ?? 0, item.name, item.dataKey)
                : formatNumber(Number(item.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
