
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { DropZone } from "./DropZone";
import { FeedbackBar } from "./FeedbackBar";
import { ResultCard } from "./ResultCard";
import { checkImageQuality } from "@/lib/quality";
import { postImagem } from "@/lib/antijegue.functions";
import { useTracking } from "@/hooks/use-tracking";

type Plataforma = "instagram" | "linkedin" | "whatsapp";
type Tom = "vendas" | "informativo" | "engracado";
type ManterTexto = "manter" | "reescrever";

async function compressAndToBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1024;
  let { width, height } = bitmap;
  if (width > max || height > max) {
    const ratio = Math.min(max / width, max / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.72);
}

// Segmented brazuca - pills claros, sem neon
function SegmentedBrazuca<T extends string>({ label, value, onChange, options }: {
  label: string;
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: string }[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] font-extrabold uppercase tracking-wide text-black/70">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`h-10 px-4 rounded-full text-[13px] font-bold border transition-all flex items-center gap-1.5
                ${active 
                  ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-[0_4px_12px_rgba(0,0,0,0.15)]" 
                  : "bg-white text-black/70 border-black/10 hover:border-[#FF6B2B]/30 hover:text-black"}`}
            >
              {opt.icon && <span>{opt.icon}</span>}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FotoPost({ deviceId }: { deviceId: string }) {
  const run = useServerFn(postImagem);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [plataforma, setPlataforma] = useState<Plataforma | null>(null);
  const [tom, setTom] = useState<Tom | null>(null);
  const [manterTexto, setManterTexto] = useState<ManterTexto | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [post, setPost] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const { track } = useTracking();

  const reset = () => {
    setStage(1); setFile(null); setPreviewUrl(null); setBlocked(null);
    setPlataforma(null); setTom(null); setManterTexto(null);
    setErro(null); setPost(null); setExecutionId(null);
  };

  const handleFile = async (picked: File) => {
    setBlocked(null);
    const result = await checkImageQuality(picked);
    if (result.status === "block") { setBlocked(result.message); setFile(null); return; }
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
    setStage(2);
    track?.("foto_selecionada");
  };

  const submit = async () => {
    if (!file ||!plataforma ||!tom ||!manterTexto) return;
    setLoading(true); setErro(null); setStage(3);
    try {
      const b64 = await compressAndToBase64(file);
      const res: any = await run({ data: { imageBase64: b64, fileBase64: b64, mimeType: "image/jpeg", fileName: file.name, deviceId, answers: { plataforma, tom, manterTexto } } });
      if (!res.ok) {
        if (res.message?.includes("SEM_CREDITO") || res.message?.includes("LIMITE")) { window.dispatchEvent(new Event("abrir-paywall")); setStage(2); return; }
        throw new Error(res.message);
      }
      setPost(res.post || res.post_gerado);
      setExecutionId(res.executionId ?? null);
      window.dispatchEvent(new Event("credits-updated"));
      window.dispatchEvent(new CustomEvent("post-gerado", { detail: res.post || res.post_gerado }));
    } catch (e:any) {
      if(e.message?.includes("SEM_CREDITO")) { window.dispatchEvent(new Event("abrir-paywall")); setStage(2); }
      else setErro(e.message || "Erro");
    } finally { setLoading(false); }
  };

  const canSubmit = plataforma && tom && manterTexto;

  return (
    <div className="max-w-[640px] mx-auto space-y-5">
      {/* Stepper brazuca - sem AULA 1 */}
      <div className="flex items-center gap-2 text-[12px] font-bold">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center ${stage >=1 ? "bg-[#FF6B2B] text-white" : "bg-black/10 text-black/40"}`}>1</span>
        <span className={stage>=1 ? "text-black" : "text-black/40"}>Foto</span>
        <div className="w-6 h-[2px] bg-black/10" />
        <span className={`w-6 h-6 rounded-full flex items-center justify-center ${stage >=2 ? "bg-[#FF6B2B] text-white" : "bg-black/10 text-black/40"}`}>2</span>
        <span className={stage>=2 ? "text-black" : "text-black/40"}>3 perguntas</span>
        <div className="w-6 h-[2px] bg-black/10" />
        <span className={`w-6 h-6 rounded-full flex items-center justify-center ${stage >=3 ? "bg-[#FF6B2B] text-white" : "bg-black/10 text-black/40"}`}>3</span>
        <span className={stage>=3 ? "text-black" : "text-black/40"}>Resultado</span>
      </div>

      {stage === 1 && (
        <div className="rounded-[24px] bg-white border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-2">
          <DropZone 
            accept="image/*" 
            icon={<ImageIcon className="h-7 w-7 text-[#FF6B2B]" />} 
            title="Manda a foto do produto" 
            hint="JPG ou PNG - pode ser do celular mesmo" 
            onFile={handleFile} 
          />
          <p className="text-center text-[11px] text-black/40 py-2 font-medium">Leva 10 seg • Instantâneo • Usa no Instagram, WhatsApp ou LinkedIn</p>
        </div>
      )}

      {blocked && (
        <div className="flex gap-2 p-3 text-sm bg-amber-50 border border-amber-200 rounded-[14px] text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5" />{blocked}
        </div>
      )}

      {stage === 2 && (
        <div className="space-y-5 rounded-[24px] border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
          {/* Preview da foto */}
          {previewUrl && (
            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-[#FFFBF5] border border-black/[0.05]">
              <img src={previewUrl} className="w-12 h-12 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate">{file?.name}</p>
                <p className="text-[11px] text-black/50">Pronta pra virar propaganda • 1 crédito</p>
              </div>
              <button onClick={reset} className="text-[11px] font-bold text-black/50 hover:text-black px-2">Trocar</button>
            </div>
          )}

          <SegmentedBrazuca<Plataforma> 
            label="1. Onde vai postar?" 
            value={plataforma} 
            onChange={setPlataforma} 
            options={[
              { value: "instagram", label: "Instagram", icon: "◎" }, 
              { value: "whatsapp", label: "WhatsApp", icon: "💬" }, 
              { value: "linkedin", label: "LinkedIn", icon: "in" }
            ]} 
          />
          <SegmentedBrazuca<Tom> 
            label="2. Qual tom?" 
            value={tom} 
            onChange={setTom} 
            options={[
              { value: "vendas", label: "Vendas" }, 
              { value: "informativo", label: "Informativo" }, 
              { value: "engracado", label: "Engraçado" }
            ]} 
          />
          <SegmentedBrazuca<ManterTexto> 
            label="3. Tem texto na foto?" 
            value={manterTexto} 
            onChange={setManterTexto} 
            options={[
              { value: "manter", label: "Manter texto" }, 
              { value: "reescrever", label: "Reescrever tudo" }
            ]} 
          />

          <button 
            onClick={submit} 
            disabled={!canSubmit}
            className={`w-full rounded-full px-6 py-4 font-bold text-[16px] flex items-center justify-center gap-2 transition
              ${canSubmit ? "bg-[#FF6B2B] text-white shadow-[0_10px_20px_rgba(255,107,43,0.3)] hover:brightness-105 active:scale-[0.98]" : "bg-black/10 text-black/30 cursor-not-allowed"}`}
          >
            <Sparkles className="h-4 w-4" />
            Gerar minha propaganda - 1 crédito
          </button>
          <p className="text-center text-[11px] text-black/40 font-medium">1 crédito = 1 propaganda • Acabou? 1 PIX e continua vendendo</p>
        </div>
      )}

      {stage === 3 && (
        <div className="space-y-4">
          {loading && (
            <div className="flex flex-col items-center gap-3 p-10 border border-black/[0.06] rounded-[24px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <Loader2 className="animate-spin h-8 w-8 text-[#FF6B2B]" />
              <p className="text-[14px] font-bold">A gente tá escrevendo por você...</p>
              <p className="text-[12px] text-black/50">Legenda + arte pronta em 10 seg</p>
            </div>
          )}
          {post && <ResultCard title="Sua propaganda tá pronta!" content={post} />}
          {executionId && <FeedbackBar executionId={executionId} />}
          {erro && <div className="text-[#E53935] text-sm bg-red-50 border border-red-200 rounded-xl p-3">{erro}</div>}
          {post && (
            <button onClick={reset} className="w-full rounded-full bg-white border border-black/10 py-3 text-[14px] font-bold hover:bg-black/[0.02]">
              Criar outra propaganda
            </button>
          )}
        </div>
      )}
    </div>
  );
}

