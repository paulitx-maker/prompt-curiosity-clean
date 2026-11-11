import { useState, useEffect } from "react"

type Pacote = { id: string; qtd_creditos: number; valor_brl: number; preco_centavos: number; destaque?: boolean; ordem: number; ativo: boolean; }

export function PaywallBottomSheet() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pix, setPix] = useState<{ qr_code_base64?: string; qr_code?: string; correlation_id?: string } | null>(null)
  const [showPix, setShowPix] = useState(false)
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [selectedPack, setSelectedPack] = useState<string>("pack_10")

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("abrir-paywall" as any, handler)
    window.addEventListener("open-paywall" as any, handler) // compatibilidade antiga
    return () => {
      window.removeEventListener("abrir-paywall" as any, handler)
      window.removeEventListener("open-paywall" as any, handler)
    }
  }, [])

useEffect(() => {
  (async () => {
    try {
      const url = (import.meta as any).env?.VITE_SUPABASE_URL;
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;
      if (!url ||!anon) return;
      const res = await fetch(`${url}/rest/v1/pacotes_credito?ativo=eq.true&order=ordem.asc&select=*`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` }
      });
      if (res.ok) {
        const data = await res.json();
        // tabela usa `creditos`, não `qtd_creditos`
        const filtrados = data
         .filter((p:any) => p.ativo && p.preco_centavos <= 1000)
         .map((p:any) => ({
           ...p,
            valor_brl: p.preco_centavos? p.preco_centavos/100 : p.valor_brl,
            creditos: p.creditos,
            qtd_creditos: p.creditos || p.qtd_creditos || p.qtd || 10,
            destaque:!!p.destaque
          }))
         .sort((a:any,b:any) => a.ordem - b.ordem)
         .slice(0,2); // 10/R$1,99 e 30/R$4,99 destaque
        if (filtrados.length > 0) {
          setPacotes(filtrados);
          const destaque = filtrados.find((p:any)=>p.destaque) || filtrados[0];
          setSelectedPack(destaque.id || destaque.pack_id || "pack_10");
        }
      }
    } catch {}
  })();
}, [])

  async function handleClick(packId?: string) {
    const pack = packId || selectedPack
    if (pix) {
      setShowPix(true)
      return
    }
    setLoading(true)
    try {
      const device_id = localStorage.getItem("device_id") || ""
      const res = await fetch("/api/criar-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id, pack_id: pack, preco: pacotes.find(p=>p.id===pack)?.valor_brl || 1.99 })
      })
      const data = await res.json()
      if (data.qr_code || data.qr_code_base64) {
        setPix(data)
        setShowPix(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        onClick={()=>handleClick()}
        className="fixed bottom-[72px] left-3 right-3 z-[90] flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-2xl animate-in slide-in-from-bottom cursor-pointer"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[12px] text-white">!</span>
        <p className="flex-1 text-[13px] font-medium text-black">
          {loading? "Gerando PIX..." : `Sem créditos. Desbloqueie por R$${(pacotes.find(p=>p.id===selectedPack)?.valor_brl || 1.99).toFixed(2).replace('.',',')}`}
        </p>
        <span className="text-[11px] font-bold text-cyan-600">{pix? "Ver QR" : "PIX"}</span>
      </div>

      {showPix && pix && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60" onClick={() => setShowPix(false)}>
          <div className="w-full max-w-md rounded-t-[24px] bg-[#12121A] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white">Pague com PIX</h3>
            <div className="mt-3 flex gap-2">
              {pacotes.map(p=>(
                <button key={p.id} onClick={()=>{ setSelectedPack(p.id); setPix(null); handleClick(p.id); }} className={`flex-1 rounded-xl border p-3 text-left ${selectedPack===p.id ? 'bg-[#FF6B00] border-[#FF6B00] text-white' : 'bg-white/10 border-white/10 text-white'}`}>
                  <p className="text-[12px] font-bold">{p.qtd_creditos} créditos {p.destaque?'• DESTAQUE':''}</p>
                  <p className="text-[14px] font-extrabold">R$ {Number(p.valor_brl).toFixed(2).replace('.',',')}</p>
                  <p className="text-[10px] opacity-70">R$ {(p.valor_brl/p.qtd_creditos).toFixed(2).replace('.',',')}/crédito</p>
                </button>
              ))}
            </div>
            {pix.qr_code_base64 && (
              <img src={`data:image/png;base64,${pix.qr_code_base64}`} className="mx-auto mt-4 w-64 rounded-xl bg-white p-2" />
            )}
            <button onClick={() => navigator.clipboard.writeText(pix.qr_code || "")} className="mt-4 w-full rounded-xl bg-[#00E5FF] py-3 font-bold text-black">
              Copiar código PIX
            </button>
            <p className="mt-2 text-[10px] text-zinc-400 text-center"></p>
            <button onClick={() => { setShowPix(false); setOpen(false) }} className="mt-3 w-full text-sm text-zinc-500">Fechar</button>
          </div>
        </div>
      )}
    </>
  )
}

