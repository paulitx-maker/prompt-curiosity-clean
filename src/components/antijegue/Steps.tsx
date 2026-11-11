import { cn } from "@/lib/utils";

const STEPS = ["Upload", "Perguntas", "Resultado"];

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const active = step === current;
        const done = step < current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                active && "bg-gradient-neon text-primary-foreground glow-soft",
                done && "bg-primary/20 text-primary",
                !active && !done && "bg-secondary text-muted-foreground",
              )}
            >
              {step}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
