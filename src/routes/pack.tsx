import React, { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router'
import { CreditsBadge } from '@/components/CreditsBadge';
import { EspacoComercial } from '@/components/EspacoComercial';

function PackPage() {
  const [filter, setFilter] = useState("Todas");
  const [deviceId, setDeviceId] = useState("web");
  const [prompts, setPrompts] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [usedToday, setUsedToday] = useState(0);

  useEffect(() => {
    const id = localStorage.getItem("device_id") || crypto.randomUUID();
    localStorage.setItem("device_id", id);
    setDeviceId(id);
    // busca usadoHoje real via ensure-user - fonte verdade
    fetch("/api/ensure-user",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({device_id:id})})
      .then(r=>r.json()).then(d=>{ if(typeof d.usadoHoje==='number') setUsedToday(d.usadoHoje); }).catch(()=>{});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const url = (import.meta as any).env?.VITE_SUPABASE_URL;
        const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;
        if (!url || !anon) { setLoading(false); return; }
        // select * já traz prompt_preview_40 + prompt_completo_100 se view tiver
        const res = await fetch(`${url}/rest/v1/vw_pack_venda?ativo=eq.true&select=*&limit=100&order=categoria.asc`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` }
        });
        if (res.ok) setPrompts(await res.json());
      } catch(e){ console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const [cats, setCats] = useState<string[]>(["Todas"]);
  useEffect(() => {
    (async () => {
      try {
        const url = (import.meta as any).env?.VITE_SUPABASE_URL;
        const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;
        if (!url || !anon) return;
        const res = await fetch(`${url}/rest/v1/vw_pack_venda?ativo=eq.true&select=categoria`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` }
        });
        if (res.ok) {
          const data: { categoria: string }[] = await res.json();
          const uniq = Array.from(new Set(data.map(d => d.categoria))).filter(Boolean).sort();
          setCats(["Todas", ...uniq]);
        }
      } catch {}
    })();
  }, []);

  const copiar = async (p: any) => {
    try {
      const url = (import.meta as any).env?.VITE_SUPABASE_URL;
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;
      if (!url || !anon) { alert("Supabase não configurado"); return; }

      // 1. Debita crédito via RPC - mantém realtime que já funciona 7->6 etc
      const res = await fetch(`${url}/rest/v1/rpc/copiar_prompt_pack`, {
        method: 'POST',
        headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_device_id: deviceId, p_prompt_id: p.id })
      });
      if (!res.ok) {
        const txt = await res.text();
        if (txt.includes('SEM_CREDITO') || res.status===402) {
          window.dispatchEvent(new CustomEvent('abrir-paywall'));
          return;
        }
        throw new Error(txt);
      }
      const data = await res.json();

      // 2. CORREÇÃO sem regressão: prioriza completo que já está no p (vem de select *), depois retorno RPC, depois busca direta
      let texto = p.prompt_completo_100 || p.prompt_completo || p.conteudo_completo || '';
      
      if (!texto || texto.length < 60) {
        // fallback: o que RPC retornou (pode ser string ou objeto com prompt)
        const fromRpc = typeof data === 'string' ? data : (data.prompt_completo_100 || data.prompt_completo || data.prompt || data.texto || '');
        if (fromRpc && fromRpc.length > texto.length) texto = fromRpc;
      }

      if (!texto || texto.length < 60) {
        // último fallback sem quebrar: busca direta pelo id garantindo coluna completa
        try {
          const r2 = await fetch(`${url}/rest/v1/vw_pack_venda?id=eq.${p.id}&select=prompt_completo_100,prompt_completo,prompt,conteudo_completo&limit=1`, {
            headers: { apikey: anon, Authorization: `Bearer ${anon}` }
          });
          if (r2.ok) {
            const d2 = await r2.json();
            if (d2[0]) {
              texto = d2[0].prompt_completo_100 || d2[0].prompt_completo || d2[0].prompt || d2[0].conteudo_completo || texto;
            }
          }
        } catch {}
      }

      // se ainda não achou completo, usa preview (não deixa vazio) - mas loga para debug
      if (!texto) {
        console.warn('prompt_completo_100 não encontrado, usando preview_40', Object.keys(p));
        texto = p.prompt_preview_40 || '';
      }

      const novoSaldo = typeof data === 'object' && typeof data.credits === 'number' ? data.credits : null;
      await navigator.clipboard.writeText(texto);

      // mantém realtime que você já validou: saldo certo ao abrir e -1 ao copiar
      if (novoSaldo !== null) {
        window.dispatchEvent(new CustomEvent('credits-updated', { detail: { credits: novoSaldo, usadoHoje: usedToday + 1 } }));
        setUsedToday(v => v + 1);
      } else {
        window.dispatchEvent(new CustomEvent('credits-updated', { detail: { delta: -1 } }));
        setUsedToday(v => v + 1);
      }
    } catch (e: any) {
      if (e?.message?.includes('SEM_CREDITO')) {
        window.dispatchEvent(new CustomEvent('abrir-paywall'));
      } else console.error(e);
    }
  };

  const getFeedbackMailto = (p: any) => {
    const subject = `Feedback - ${p.titulo} [${p.id.slice(0,8)}]`;
    const body = `Qual prompt você testou? ${p.titulo}
ID: ${p.id}

O que tentei fazer:

Funcionou? (resolveu / melhorou / piorou / não serviu):

Onde falhou:

O que precisei adaptar:

Economizou tempo? Quanto?
`;
    return `mailto:naoehgolpe@icloud.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const filtrados = prompts.filter(p => {
    const matchCat = filter === "Todas" || p.categoria === filter;
    const matchBusca = busca === "" || p.titulo.toLowerCase().includes(busca.toLowerCase()) || (p.prompt_preview_40 && p.prompt_preview_40.toLowerCase().includes(busca.toLowerCase()));
    return matchCat && matchBusca;
  });

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#1A1A1A]">
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 py-12">
        <div className="text-center max-w-[640px] mx-auto">
          <h1 className="text-[32px] font-extrabold tracking-tight">Brazilian Prompt Pack</h1>
          <div className="mt-3 flex items-center justify-center gap-3">
            <CreditsBadge deviceId={deviceId} usedToday={usedToday} limitToday={10} />
            <span className="text-[13px] text-black/50">• Mais de {prompts.length} prompts prontos. Acabou o crédito? Recarrega com um PIX e continua.</span>
          </div>
          <div className="mt-4">
            <a href="/" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-black/10 text-[12px] font-bold hover:bg-black/[0.02]">← Voltar pra gerar post</a>
          </div>
        <div className="mt-4"><EspacoComercial posicao="pack_top" modo="fixo" /></div>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {cats.map(c => (
              <button key={c} onClick={()=> setFilter(c)} className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition ${filter===c? "bg-[#1A1A1A] text-white border-black" : "bg-white border-black/10 text-black/60 hover:border-[#FF6B00]/30"}`}>{c}</button>
            ))}
          </div>
          <div className="mt-6">
            <input value={busca} onChange={e=> setBusca(e.target.value)} placeholder="Buscar por título ou conteúdo..." className="w-full h-11 rounded-full border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-[#FF6B00]/30 focus:ring-2 focus:ring-[#FF6B00]/10" />
          </div>
        </div>

        {loading ? (
          <div className="mt-10 text-center py-20">
            <div className="inline-block w-6 h-6 border-2 border-[#FF6B00]/30 border-t-[#FF6B00] rounded-full animate-spin" />
            <p className="mt-3 text-[13px] text-black/50">Carregando biblioteca real...</p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {filtrados.map((p,i)=> (
              <div key={p.id || i} className="rounded-[20px] bg-white border border-black/[0.06] p-5 shadow-[0_4px_18px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-[#FF6B00]/20 transition group flex flex-col">
                <span className="inline-flex px-2.5 py-1 rounded-full bg-[#FFF5EB] border border-[#FF6B00]/15 text-[#FF6B00] text-[10px] font-extrabold uppercase w-fit">{p.categoria}</span>
                <h3 className="mt-3 font-extrabold text-[15px] leading-[1.3] group-hover:text-[#FF6B00] transition">{p.titulo}</h3>
                <p className="mt-2 text-[12px] leading-[1.4] text-black/60 line-clamp-3 flex-1">{p.prompt_preview_40}...</p>
                <div className="mt-3 p-2.5 rounded-xl bg-[#FFFBF5] border border-dashed border-black/10 text-[11px] leading-[1.3]">
                  <a href={getFeedbackMailto(p)} className="font-bold hover:text-[#FF6B00] transition">🧪 Testou este prompt?</a>
                  <a href={getFeedbackMailto(p)} className="ml-1 underline text-black/60 hover:text-black">Enviar feedback →</a>
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={()=> copiar(p)} className="px-4 py-1.5 rounded-full bg-[#1A1A1A] text-white text-[11px] font-bold hover:bg-black transition">Copiar - 1 crédito</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && filtrados.length === 0 && (
          <div className="mt-10 text-center py-10 text-[14px] text-black/50">Nenhum prompt encontrado para "{busca}" em {filter}</div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/pack')({
  component: PackPage,
})
