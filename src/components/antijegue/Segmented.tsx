import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-xl border px-3 py-3 text-xs font-medium transition-all",
                active
                  ? "border-transparent bg-gradient-neon text-primary-foreground glow-soft"
                  : "border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
