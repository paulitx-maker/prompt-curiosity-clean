
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  accept: string;
  title: string;
  hint: string;
  icon: ReactNode;
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ accept, title, hint, icon, onFile, disabled }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-[20px] border-[1.5px] border-dashed px-6 py-12 text-center transition-all bg-[#FFFBF5]/50",
          over
            ? "border-[#FF6B2B] bg-[#FFF5EB] shadow-[0_8px_24px_rgba(255,107,43,0.12)] scale-[1.01]"
            : "border-black/10 hover:border-[#FF6B2B]/30 hover:bg-white",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#FF6B2B] text-white shadow-[0_8px_16px_rgba(255,107,43,0.25)]">
          {icon}
        </span>
        <span className="text-[15px] font-extrabold tracking-tight text-[#1A1A1A]">{title}</span>
        <span className="max-w-[18rem] text-[12px] font-medium text-black/50 leading-[1.4]">{hint}</span>
        <span className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black/10 text-[11px] font-bold text-black/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          Clique ou arraste - leva 10 seg
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
