// src/hooks/use-credits.ts
import { supabase } from '@/integrations/supabase/client'
import { getDeviceId } from '@/lib/device'
import { useTracking } from './use-tracking'

/**
 * Uso client-side LEGÍTIMO: só para ações sem chamada de IA
 * (ex: resgatar/copiar um prompt do /pack). Geração de post/áudio via IA
 * NUNCA deve chamar isso - o desconto real acontece no servidor,
 * dentro de runPostImagem/runAudioResumo, junto com o custo real da API.
 */
export function useCredits() {
  const { track } = useTracking()

  const consume = async (tipo: 'consumo_copia' | 'resgate_pack', pack_id: string, prompt_id?: string) => {
    const device_id = getDeviceId()
    if (!device_id) throw new Error('sem device_id')

    // _custo em dólar, não em unidade de crédito - charge_credit sempre desconta 1 crédito fixo
    // e soma _custo em total_gasto_usd. Ações sem custo de API real usam 0 (não infla o relatório).
    const { data: novoSaldo, error } = await supabase.rpc('charge_credit', {
      _device_id: device_id,
      _custo: 0,
    })

    if (error) {
      console.error('[useCredits] charge_credit falhou:', error.message)
      throw error
    }
    if (novoSaldo === null || novoSaldo < 0) {
      throw new Error('SEM_CREDITO')
    }

    const { error: txError } = await supabase.from('credit_transactions').insert({
      device_id,
      tipo,
      pack_id,
      prompt_id: prompt_id ?? null,
      qtd: -1,
      saldo_depois: novoSaldo,
    })
    if (txError) {
      // Não interrompe o fluxo (crédito já foi descontado de verdade),
      // mas registra pra não perder rastro silenciosamente como antes.
      console.error('[useCredits] credit_transactions insert falhou:', txError.message)
    }

    track('credit_consumed', { pack_id, prompt_id, tipo, novoSaldo })
    window.dispatchEvent(new Event('credits-updated'))
    return novoSaldo
  }

  return { consume }
}