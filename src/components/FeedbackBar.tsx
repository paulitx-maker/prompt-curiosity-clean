import { useState } from "react";
import { Star, Send, Check, Sparkles } from "lucide-react";

type Props = {
  executionId: string | null;
  onFeedback?: (rating: number, allowGallery: boolean) => void;
};

export function FeedbackBar({ executionId, onFeedback }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [allowGallery, setAllowGallery] = useState(true);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const activeRating = hovered ?? rating;

  const getMessage = () => {
    if (!activeRating) return "Sua opinião faz a gente gastar menos IA e te entregar mais rápido";
    if (activeRating <= 2) return "Poxa, vamos melhorar. O que faltou? Seu feedback nos ajuda a corrigir o prompt.";
    if (activeRating === 3) return "Valeu! O que faltou pra virar 5 estrelas? Conta pra gente.";
    if (activeRating === 4) return "Boa! Com 4+ estrelas e seu consentimento, podemos usar só o TEXTO gerado (não a foto) como exemplo anônimo.";
    return "Incrível! Com 4-5★ e seu consentimento, seu POST (não a foto) pode virar exemplo anônimo na biblioteca viva nota 4/5.";
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setSending(true);
    try {
      const url = (import.meta as any).env?.VITE_SUPABASE_URL;
      const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;
      if (url && anon && executionId) {
        // PRIVACIDADE TOS: só autoriza POST gerado, nunca imagem original. Imagem (imageBase64) não é salva em executions.
        // Só marca pode_usar_publico=true se nota>=4 E allowGallery=true
        const pode_usar = allowGallery && rating >= 4;
        await fetch(`${url}/rest/v1/executions?id=eq.${executionId}`, {
          method: 'PATCH',
          headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ 
            nota: rating, 
            rating: rating,
            allow_gallery: allowGallery,
            pode_usar_publico: pode_usar,
            feedback_at: new Date().toISOString(),
            // nunca salvar imagem: garante que imageBase64 não vai pra coluna imagem
          })
        });
      }
    } catch {}
    onFeedback?.(rating, allowGallery);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 600);
  };

  if (sent) {
    return (
      <div className="rounded-[20px] border border-[#22C55E]/20 bg-[#F0FDF4] p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#22C55E] text-white flex items-center justify-center"><Check className="w-5 h-5" /></div>
        <div>
          <p className="text-[13px] font-extrabold text-[#166534]">Valeu pelo feedback!</p>
          <p className="text-[11px] text-[#15803D]">Consentimento registrado: {allowGallery && rating && rating>=4 ? "POST pode virar exemplo anônimo (foto nunca)" : "POST não será usado como exemplo"}. Isso alimenta biblioteca viva nota 4/5.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-[#FF6B00]/20 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-extrabold tracking-tight text-[#1A1A1A] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FF6B00]" />
          Quanto esse resultado resolveu? (1-5)
        </p>
        {rating && (
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${rating>=4 ? "bg-[#DCFCE7] text-[#166534]" : rating===3 ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
            {rating} estrela{rating>1?"s":""}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {[1,2,3,4,5].map((s) => {
          const filled = activeRating !== null && s <= activeRating;
          return (
            <button
              key={s}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setRating(s)}
              className={`w-10 h-10 rounded-[12px] border flex items-center justify-center transition-all
                ${filled 
                  ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-[0_4px_12px_rgba(255,107,0,0.25)] scale-[1.05]" 
                  : "bg-white border-black/10 text-black/30 hover:border-[#FF6B00]/30 hover:text-[#FF6B00]/60 hover:bg-[#FFFBF5]"}`}
            >
              <Star className={`w-5 h-5 ${filled ? "fill-white" : ""}`} />
            </button>
          );
        })}
      </div>

      <div className={`rounded-[14px] p-3 text-[12px] leading-[1.4] font-medium border transition-all
        ${!activeRating ? "bg-[#FFFBF5] border-[#FF6B00]/10 text-black/60" 
          : activeRating<=2 ? "bg-[#FEF2F2] border-[#FECACA] text-[#7F1D1D]"
          : activeRating===3 ? "bg-[#FFFBEB] border-[#FDE68A] text-[#78350F]"
          : "bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]"}`}>
        {getMessage()}
      </div>

      <label className="flex gap-2.5 p-3 rounded-[14px] border border-dashed border-black/15 bg-white hover:bg-[#FFFBF5] hover:border-[#FF6B00]/30 cursor-pointer transition group">
        <input 
          type="checkbox" 
          checked={allowGallery} 
          onChange={(e)=> setAllowGallery(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-black/20 text-[#FF6B00] focus:ring-[#FF6B00]/20"
        />
        <span className="text-[12px] leading-[1.4] text-black/70 group-hover:text-black">
          Autorizo usar <strong>apenas o POST gerado</strong> (texto/legenda) como exemplo anônimo na biblioteca? <span className="text-black/40">(nunca sua foto original - imageBase64 não é salva, se precisar exibir imagem no exemplo aplicamos blur 30% filter:blur(12px) opacity 0.7 pra impedir identificação - TOS/Privacidade)</span>
          {allowGallery && rating && rating>=4 && (
            <span className="block mt-1 text-[11px] font-bold text-[#166534]">→ Com 4-5★ + consentimento, seu TEXTO entra na biblioteca viva nota 4/5. Foto original nunca é salva nem exibida.</span>
          )}
        </span>
      </label>

      <button
        onClick={handleSubmit}
        disabled={!rating || sending}
        className={`w-full rounded-full px-6 py-3.5 font-bold text-[14px] flex items-center justify-center gap-2 transition-all
          ${rating 
            ? "bg-[#1A1A1A] text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:bg-black active:scale-[0.98]" 
            : "bg-black/10 text-black/30 cursor-not-allowed"}`}
      >
        {sending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            {rating ? `Enviar nota ${rating} ${allowGallery && rating>=4 ? '(autoriza POST)' : '(não autoriza)'}` : "Escolha uma nota"}
          </>
        )}
      </button>
    </div>
  );
}

