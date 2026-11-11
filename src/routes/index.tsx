import React from 'react';
import { createFileRoute } from '@tanstack/react-router'
import { CreditsBadge } from '@/components/CreditsBadge';
import { FotoPost } from '@/components/antijegue/FotoPost';
import { PackDrawer } from '@/components/PackDrawer';
import { EspacoComercial } from '@/components/EspacoComercial';

function IndexPage() {
  const [deviceId, setDeviceId] = React.useState<string>("web");
  const [biblioteca, setBiblioteca] = React.useState<any[]>([]);
  const [bibliotecaCarregando, setBibliotecaCarregando] = React.useState(true);
  
  React.useEffect(() => {
    try {
      let id = localStorage.getItem("device_id");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("device_id", id);
      }
      setDeviceId(id);
    } catch {
      setDeviceId("web");
    }
  }, []);

  React.useEffect(() => {
  (async () => {
    try {
      const url = (import.meta as any).env?.VITE_SUPABASE_URL;
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;
      if (!url ||!anon) return;
      const res = await fetch(`${url}/rest/v1/rpc/get_random_executions`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        // RPC retorna colunas: id, tipo, file_name, created_at, custo_usd, modelo_usado, tema_extraido, prompt_final, user_id, device_id, post_gerado, pode_usar_publico
        setBiblioteca((data || []).slice(0,6));
      } else {
        const res2 = await fetch(`${url}/rest/v1/executions?pode_usar_publico=eq.true&select=*&limit=20`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` }
        });
        if (res2.ok) {
          const all = await res2.json();
          setBiblioteca(all.sort(() => 0.5 - Math.random()).slice(0,6));
        }
      }
    } catch {} finally {
      setBibliotecaCarregando(false);
    }
  })();
  }, []);

  const scrollToUpload = () => {
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#1A1A1A] relative overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url('/printfotofundo.png')", backgroundRepeat: 'repeat', backgroundSize: '600px' }} />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: "url('/gold_mudra_pattern.png')", backgroundRepeat: 'repeat', backgroundSize: '600px' }} />
      </div>

      <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#FFFBF5]/80 border-b border-black/[0.05]">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00] flex items-center justify-center text-white font-black text-[18px] shadow-[0_6px_16px_rgba(255,107,0,0.35)]">A</div>
            <span className="font-extrabold text-[18px] tracking-tight lowercase"><span className="text-[#FF6B00]">anti</span><span className="text-[#1A1A1A]">-jegue</span></span>
            <span className="ml-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white border border-[#FF6B00]/40 text-[#FF6B00]">BETA</span>
          </div>
          <CreditsBadge deviceId={deviceId} />
        </div>
      </header>

      <main className="relative z-10 max-w-[1120px] mx-auto px-5 sm:px-8">
        <div className="mx-auto max-w-[760px] pt-12 sm:pt-20 pb-10 text-center">
          <h1 className="mt-6 text-[34px] sm:text-[52px] font-extrabold tracking-[-0.04em] leading-[0.95]">Manda uma foto, que a gente cria o seu post</h1>
          <p className="mt-4 text-[16px] sm:text-[18px] leading-[1.5] text-black/60 font-medium max-w-[600px] mx-auto">Você não escreve nada. Só arrasta a sua foto do seu produto por exemplo e recebe a  legenda pronta pra postar e vender.</p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <button onClick={scrollToUpload} className="inline-flex items-center justify-center rounded-full bg-[#FF6B00] text-white px-10 py-[18px] text-[18px] sm:text-[20px] font-bold shadow-[0_12px_24px_rgba(255,107,0,0.3)] hover:brightness-105 active:scale-[0.98] transition">Mandar foto grátis →</button>
            <p className="text-[12px] sm:text-[13px] font-medium text-black/50"><span className="font-bold text-black/70">3 créditos grátis pra testar.</span> 1 crédito = 1 propaganda. Acabou? <span className="font-bold text-[#FF6B00]">1 PIX e continua vendendo.</span></p>
          </div>
        </div>

        <div id="upload-section" className="max-w-[720px] mx-auto pb-14 scroll-mt-[80px]">
          <FotoPost deviceId={deviceId} />
        </div>

           
        <div className="pb-8"><EspacoComercial posicao="home_meio" modo="fixo" /></div>

        <div className="pb-8">
          <div className="flex justify-between items-baseline mb-5">
            <h2 className="font-extrabold text-[22px] sm:text-[26px] tracking-tight">Biblioteca pronta de propagandas</h2>
            <span className="text-[13px] font-semibold text-black/50">posts que nossos usuários adoraram!</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bibliotecaCarregando ? (
              <div className="col-span-3 py-10 text-center text-[13px] text-black/40">Carregando biblioteca viva...</div>
            ) : biblioteca.length === 0 ? (
              <div className="col-span-3 py-10 text-center text-[13px] text-black/40">Ainda não há posts públicos para mostrar. Os próximos resultados autorizados aparecem aqui.</div>
            ) : biblioteca.map((item:any) => (
              <div key={item.id} className="rounded-[20px] bg-white border border-black/[0.06] p-4 flex gap-3.5 shadow-[0_4px_18px_rgba(0,0,0,0.03)] relative overflow-hidden">
                <div className="w-[64px] h-[64px] rounded-[14px] flex items-center justify-center text-[26px] shrink-0 border border-black/[0.04]" style={{ background: '#FFF5EB' }}>📸</div>
                <div className="min-w-0 flex-1 relative">
                  <div className="flex justify-between items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#FFF5EB] border border-[#FF6B00]/15 text-[#FF6B00] text-[10px] font-extrabold uppercase">{item.tema_extraido || item.tipo || 'GERAL'}</span>
                    <span className="text-[10px] text-black/40" suppressHydrationWarning>{item.created_at? new Date(item.created_at).toLocaleDateString('pt-BR') : ''}</span>
                  </div>
                  <div className="relative mt-2">
                    <p className="text-[14px] leading-[1.4] text-black/70 font-medium line-clamp-3">{(item.post_gerado || item.prompt_final || '').slice(0,140)}</p>
                    <div className="absolute bottom-0 left-0 right-0 h-[28px] bg-gradient-to-b from-transparent to-white pointer-events-none" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>



        <div className="pb-8">
          <PackDrawer onOpenPack={()=> window.location.href='/pack'} />
        </div>

        <div className="pb-8">
          <h3 className="text-[12px] font-bold uppercase tracking-widest text-black/40 mb-3">Nossos parceiros</h3>
          <EspacoComercial posicao="home_after_packdrawer" modo="parceiros" />
        </div>
      </main>

      <footer className="relative z-10 border-t border-black/[0.06] bg-white/80 backdrop-blur">
        <div className="max-w-[1120px] mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row justify-between gap-3 text-[13px]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white font-black text-[14px]">A</div>
            <span className="font-extrabold tracking-tight lowercase"><span className="text-[#FF6B00]">anti</span>-jegue</span>
            <span className="ml-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-white border border-[#FF6B00]/40 text-[#FF6B00]">BETA</span>
            <span className="ml-2">• feito pra quem vende</span>
          </div>
          <div className="flex items-center gap-4 text-black/50">
            <span>1 crédito = 1 propaganda</span>
            <span className="hidden sm:inline">•</span>
            <span>Supabase real • random</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: IndexPage,
})
