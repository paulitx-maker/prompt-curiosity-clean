import { useState, useEffect } from "react";
import { Lock, Sparkles, ChevronRight, BookOpen, Gift } from "lucide-react";

type PackDrawerProps = { onOpenPack?: () => void; };

export function PackDrawer({ onOpenPack }: PackDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [promptsVivos, setPromptsVivos] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const url = (import.meta as any).env?.VITE_SUPABASE_URL;
        const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;
        if (!url || !anon) return;
        const res = await fetch(`${url}/rest/v1/vw_pack_venda?ativo=eq.true&limit=2&select=*`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` }
        });
        if (res.ok) setPromptsVivos(await res.json());
      } catch {}
    })();
  }, []);

  const modulosEmBreve = [
    { titulo: "Fundamentos de automação em finanças", desc: "Mock complexo - exige trabalho pra construir" },
    { titulo: "Arquitetura leve de automações", desc: "Mock complexo - n8n + Supabase + Edge Functions" },
    { titulo: "Integração com APIs e Webhooks", desc: "Mock complexo - MP, Supabase, Vercel Bypass" },
  ];

  return (
    <div id="biblioteca" className="mt-16 relative overflow-hidden rounded-[24px] border border-black/[0.08] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFBF5] border border-[#FF6B00]/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#FF6B00]" />
            </div>
            <div>
              <h3 className="font-extrabold text-[18px] tracking-tight">Prompts refinados & Módulos de conhecimento</h3>
              <p className="text-[12px] text-black/50 font-medium">Dá uma olhada nos prompts vivos e nos módulos em desenvolvimento</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-black/40">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            Vivo
          </div>
        </div>
        
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {promptsVivos.length === 0 ? (
            <>
              <div className="rounded-[14px] bg-[#FFF5EB] border border-[#FF6B00]/10 p-3 h-[100px] animate-pulse"><div className="w-6 h-6 rounded-lg bg-[#FF6B00]/20 mb-2" /><div className="h-2 bg-black/10 rounded w-3/4" /></div>
              <div className="rounded-[14px] bg-[#EDE9FE] border border-[#8B5CF6]/10 p-3 h-[100px] animate-pulse"><div className="w-6 h-6 rounded-lg bg-[#8B5CF6]/20 mb-2" /><div className="h-2 bg-black/10 rounded w-3/4" /></div>
            </>
          ) : promptsVivos.map((p:any)=>(
            <div key={p.id} className="rounded-[14px] bg-white border border-black/10 p-3 relative overflow-hidden shadow-sm hover:shadow-md transition" style={{borderLeft:`4px solid ${p.categoria==='MARKETING'?'#FF6B00':'#8B5CF6'}`}}>
              <p className="text-[11px] font-bold text-[#FF6B00] uppercase">{p.categoria}</p>
              <p className="text-[11px] font-bold mt-1 line-clamp-2">{p.titulo}</p>
              <p className="text-[10px] text-black/50 mt-1 line-clamp-2 relative">{p.prompt_preview_40}<div className="absolute bottom-0 left-0 right-0 h-[16px] bg-gradient-to-b from-transparent to-white" /></p>
            </div>
          ))}
          <div className="rounded-[14px] bg-[#1A1A1A] text-white p-3 border border-black/10">
            <p className="text-[11px] font-bold flex items-center gap-1"><Lock className="w-3 h-3" /> Em breve</p>
            <p className="text-[10px] font-bold mt-1">{modulosEmBreve[Math.floor(Math.random()*3)].titulo}</p>
            <p className="text-[9px] text-white/50 mt-1">Excel, Python e mais...</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-5">
        {!isOpen ? (
          <button onClick={()=> setIsOpen(true)} className="w-full group relative rounded-full bg-[#1A1A1A] text-white px-5 py-3.5 font-bold text-[14px] flex items-center justify-between overflow-hidden hover:bg-black transition">
            <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><Gift className="w-4 h-4" /></div><span>Segura pra descobrir - 2 vivos + 1 em breve</span></div>
            <div className="flex items-center gap-1 text-white/60 group-hover:text-white"><span className="text-[12px]">Abrir</span><ChevronRight className="w-4 h-4" /></div>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[16px] bg-[#FFFBF5] border border-[#FF6B00]/20 p-4 flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center font-black">1</div>
              <div className="flex-1">
                <p className="text-[13px] font-extrabold">Resgate o 1º módulo grátis em breve</p>
                <p className="text-[12px] text-black/60"></p>
                <button onClick={onOpenPack} className="mt-2 text-[12px] font-bold text-[#FF6B00] hover:underline">Abrir nos prompts →</button>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#22C55E] text-white h-fit">GRÁTIS</span>
            </div>
            <div className="rounded-[16px] bg-[#1A1A1A] text-white p-4 flex gap-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Lock className="w-5 h-5" /></div>
              <div className="flex-1">
                <p className="text-[13px] font-extrabold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" /> Desbloqueia +4 módulos por R$ 4,99</p>
                <p className="text-[12px] text-white/60">Fundamentos finanças, Arquitetura leve, Integração APIs/Webhooks e muito mais por vir!</p>
                <div className="mt-3 flex gap-2">
                  <button className="px-4 py-2 rounded-full bg-[#FF6B00] text-white text-[12px] font-bold">PIX R$ 4,99 → libera 5 módulos</button>
                  <span className="text-[11px] text-white/40 self-center">ou continua só com grátis</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between"><button onClick={()=> setIsOpen(false)} className="text-[12px] font-bold text-black/40">Fechar gaveta</button><button onClick={onOpenPack} className="text-[12px] font-bold text-[#FF6B00]">Abrir nos prompts →</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
