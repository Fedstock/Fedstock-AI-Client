import { cn } from "../../lib/utils";

type TabsProps<T extends string> = {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function Tabs<T extends string>({ value, options, onChange }: TabsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-medium text-[#6B7280] transition",
            value === option.value && "bg-white text-[#111827] shadow-sm",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
