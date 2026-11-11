import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function validarAssinaturaMP(xSig: string | null, xReqId: string | null, dataId: string | null, secret: string): boolean {
  if (!xSig ||!xReqId ||!dataId ||!secret) return false
  try {
    const parts = Object.fromEntries(xSig.split(',').map(p => p.trim().split('='))) as Record<string,string>
    const ts = parts['ts']; const v1 = parts['v1']
    if (!ts ||!v1) return false
    const manifest = `id:${dataId.toLowerCase()};request-id:${xReqId};ts:${ts};`
    const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1))
  } catch { return false }
}

export const Route = createFileRoute('/api/webhook-pix')({
  server: {
    handlers: {
      POST: async ({ request }: any) => {
        const rawBody = await request.clone().text()
        const url = new URL(request.url)
        const dataId = url.searchParams.get('data.id') || (() => { try { return JSON.parse(rawBody)?.data?.id } catch { return null } })()
        if (!dataId) return Response.json({ ok: true })

        const env = process.env as any
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
        const mpSecret = env.MP_WEBHOOK_SECRET
        const mpToken = env.MP_ACCESS_TOKEN

        const valid = validarAssinaturaMP(request.headers.get('x-signature'), request.headers.get('x-request-id'), String(dataId), mpSecret)
        if (!valid) console.warn(`[WEBHOOK-PIX][${dataId}] assinatura_invalida - checar MP_WEBHOOK_SECRET`)

        try {
          // Busca estado REAL na API (não confia no body)
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, { headers: { Authorization: `Bearer ${mpToken}` } })
          const payment = await mpRes.json()
          console.log(`[WEBHOOK-PIX][${dataId}] recebido status=${payment.status} extRef=${payment.external_reference}`)

          // Marca WEBHOOK_RECEBIDO pra rastreio
          await supabase.from('pagamentos_pix').update({
            fase: 'WEBHOOK_RECEBIDO', mp_status: payment.status, raw_webhook: payment, updated_at: new Date().toISOString()
          } as any).eq('txid', payment.external_reference)

          if (payment.status!== 'approved') return Response.json({ ok: true, status: payment.status })

          // Tenta RPC atômica (anti race-condition do Claude)
          const { data, error } = await supabase.rpc('creditar_pagamento_pix', {
            p_mercadopago_id: String(dataId), p_mp_status: payment.status, p_raw_webhook: payment
          } as any)

          if (error) {
            // Fallback manual se RPC não existir ainda
            console.error(`[WEBHOOK-PIX][${dataId}] falha_rpc ${error.message} - usando fallback`)
            const { data: pag } = await supabase.from('pagamentos_pix').select('*').eq('mercadopago_id', String(dataId)).maybeSingle()
              || await supabase.from('pagamentos_pix').select('*').eq('txid', payment.external_reference).maybeSingle() as any
            if (pag && (pag as any).fase!== 'CREDITADO') {
              const qtd = Number((pag as any).qtd_creditos) || (Number((pag as any).valor_brl) >= 5? 30 : 10)
              const { data: user } = await supabase.from('users').select('credits,creditos').eq('device_id', (pag as any).device_id).maybeSingle()
              if (user) await supabase.from('users').update({ credits: (user.credits||0)+qtd, creditos: (user.creditos||0)+qtd }).eq('device_id', (pag as any).device_id)
              else await supabase.from('users').insert({ device_id: (pag as any).device_id, credits: qtd, creditos: qtd } as any)
              await supabase.from('pagamentos_pix').update({ fase: 'CREDITADO', status: 'aprovado', credited_at: new Date().toISOString() } as any).eq('id', (pag as any).id)
              console.log(`[WEBHOOK-PIX][${dataId}] CREDITADO fallback +${qtd}`)
              return Response.json({ ok: true, fallback: true, creditos: qtd })
            }
            return Response.json({ error: error.message }, { status: 500 })
          }

          const res = (data as any)?.[0]
          console.log(`[WEBHOOK-PIX][${dataId}] resultado sucesso=${res?.sucesso} ja=${res?.ja_processado} corr=${res?.correlation_id}`)
          return Response.json({ ok: true,...res })
        } catch (e: any) {
          console.error('[webhook-pix] erro', e)
          return Response.json({ ok: true })
        }
      },
    },
  },
})