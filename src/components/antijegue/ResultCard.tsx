import { useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  title: string;
  content: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function ResultCard({
  title,
  content,
  collapsible = false,
  defaultOpen = true,
}: ResultCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => collapsible && setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          {title}
          {collapsible && (
            <ChevronDown
              className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
            />
          )}
        </button>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      {open && (
        <>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{content}</p>

          {/* FIX DA CAIXA BRANCA - antes era bg-white */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("gerar-variacao"))}
              className="rounded-full bg-black px-4 py-2.5 text-xs font-semibold text-white dark:bg-white dark:text-black"
            >
              Gerar variação (1 crédito)
            </button>
            <a
              href="/biblioteca"
              className="rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Ver Biblioteca
            </a>
          </div>
        </>
      )}
    </div>
  );
}