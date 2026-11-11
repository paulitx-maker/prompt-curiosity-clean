import { useEffect, useState } from "react";

type Banner = { id: string; titulo: string; imagem_url: string; link_url: string; posicao: string; ordem: number; };
type Props = { posicao: "home_meio" | "home_after_biblioteca" | "pack_top" | "home_after_packdrawer"; modo?: "vivo_random" | "parceiros" | "fixo"; };

export function EspacoComercial({ posicao, modo = "parceiros" }: Props) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [vivo, setVivo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = (import.meta as any).env?.VITE_SUPABASE_URL;
        const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;
        if (!url || !anon) return;

        if (posicao === "home_after_biblioteca" || modo === "vivo_random") {
          const res = await fetch(`${url}/rest/v1/rpc/get_random_executions`, {
            headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
            method: 'POST'
          });
          if (res.ok) {
            const data = await res.json();
            if (data.length > 0) setVivo(data[Math.floor(Math.random() * data.length)]);
          } else {
            const res2 = await fetch(`${url}/rest/v1/executions?pode_usar_publico=eq.true&select=*&limit=20`, {
              headers: { apikey: anon, Authorization: `Bearer ${anon}` }
            });
            if (res2.ok) {
              const all = await res2.json();
              const rnd = all.sort(() => 0.5 - Math.random()).slice(0, 6);
              if (rnd.length > 0) setVivo(rnd[Math.floor(Math.random() * rnd.length)]);
            }
          }
          return;
        }

        if (posicao === "home_meio" || posicao === "pack_top" || modo === "fixo") {
          setBanners([{
            id: `fixo-${posicao}`,
            titulo: "Anti-Jegue Banner",
            imagem_url: "/banners/anti_jegue_banner.jpg",
            link_url: "https://manus.im/invitation/VS8DGZ3QZ8FSYF",
            posicao,
            ordem: 1
          }]);
          return;
        }

        const res = await fetch(`${url}/rest/v1/banners_parceiros?parceiro=eq.manus&ativo=eq.true&posicao=eq.${posicao}&order=ordem.asc&select=*`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.length === 0) {
            setBanners([{
              id: `fallback-${posicao}`,
              titulo: "Banner Parceiro",
              imagem_url: "/banners/anti_jegue_banner.jpg",
              link_url: "https://manus.im/invitation/VS8DGZ3QZ8FSYF",
              posicao,
              ordem: 1
            }]);
          } else setBanners(data);
        }
      } catch {}
    })();
  }, [posicao, modo]);

  if (vivo) {
    return (
      <div className="rounded-[20px] bg-white border border-[#FF6B00]/20 p-4 shadow flex gap-3 relative overflow-hidden">
        <div className="w-[64px] h-[64px] rounded-[14px] flex items-center justify-center text-[26px] shrink-0" style={{ background: '#FFF5EB' }}>📸</div>
        <div className="flex-1 relative">
          <span className="px-2 py-0.5 rounded-full bg-[#FF6B00] text-white text-[10px] font-bold uppercase">POST VIVO • RANDOM • {vivo.categoria || 'GERAL'}</span>
          <p className="mt-2 text-[14px] font-bold line-clamp-2">{(vivo.post_gerado || vivo.titulo || '').slice(0, 80)}</p>
          <p className="mt-1 text-[12px] text-black/60 line-clamp-2 relative">{(vivo.post_gerado || '').slice(0, 100)}<span className="absolute bottom-0 left-0 right-0 h-[20px] bg-gradient-to-b from-transparent to-white pointer-events-none" /></p>
        </div>
      </div>
    );
  }

  if (banners.length === 0) return null;
  return (
    <div className="w-full space-y-3">
      {banners.map(b => (
        <a key={b.id} href={b.link_url || "https://manus.im/invitation/VS8DGZ3QZ8FSYF"} target="_blank" rel="noopener noreferrer" className="block rounded-[20px] overflow-hidden border border-black/[0.06] shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition">
          <img src={b.imagem_url} alt={b.titulo} className="w-full h-auto object-cover" loading="lazy" />
        </a>
      ))}
    </div>
  );
}

export const BannerManus = EspacoComercial;
