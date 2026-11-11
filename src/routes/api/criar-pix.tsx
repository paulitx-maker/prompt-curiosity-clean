import { createFileRoute } from '@tanstack/react-router'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const TABELA_PRECOS: Record<string, { valor_brl: number, qtd: number }> = {
  '10': { valor_brl: 1.99, qtd: 10 },
  '30': { valor_brl: 4.99, qtd: 30 },
  'pack_10': { valor_brl: 1.99, qtd: 10 },
  'pack_30': { valor_brl: 4.99, qtd: 30 },
}

export const Route = createFileRoute('/api/criar-pix')({
  server: {
    handlers: {
      POST: async ({ request }: any) => {
        const correlation_id = crypto.randomUUID()
        try {
          const body = await request.json()
          const { device_id, pack_id } = body
          if (!device_id) return Response.json({ error: 'device_id obrigatório', correlation_id }, { status: 400 })

          const env = process.env as any
          const supabase = createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY)
          const mpToken = env.MP_ACCESS_TOKEN
          if (!mpToken?.startsWith('APP_USR-')) return Response.json({ error: 'Token MP não é produção', correlation_id }, { status: 500 })

          // valida pacote contra pacotes_credito ativo=true (segurança)
          let pack = (TABELA_PRECOS[pack_id] || TABELA_PRECOS['10']) as any
          try {
            const { data: pkg } = await supabase.from('pacotes_credito').select('*').eq('id', pack_id).eq('ativo', true).maybeSingle()
              || await supabase.from('pacotes_credito').select('*').eq('pack_id', pack_id).eq('ativo', true).maybeSingle() as any
            if(pkg){
              pack = { valor_brl: (pkg as any).preco_centavos ? (pkg as any).preco_centavos/100 : (pkg as any).valor_brl, qtd: (pkg as any).qtd_creditos }
            }
          } catch {}

          const { valor_brl, qtd } = pack

          // LIMITE MAX 400 créditos total - checa users.credits + qtd
          const { data: user } = await supabase.from('users').select('credits').eq('device_id', device_id).maybeSingle() as any
          if(user && (user.credits + qtd) > 400){
            return Response.json({ error: 'MAX_400', credits: user.credits, max: 400, correlation_id }, { status: 400 })
          }

          console.log(`[CRIAR-PIX][${correlation_id}][${device_id}] fase=CRIADO pack=${pack_id} valor=${valor_brl} qtd=${qtd}`)

          const txid = `pix_${device_id.slice(0,8)}_${Date.now()}_${correlation_id.slice(0,8)}`

          const { error: insErr } = await supabase.from('pagamentos_pix').insert({
            correlation_id, device_id, txid, valor_brl, pack_id: pack_id || '10',
            qtd_creditos: qtd, status: 'pendente', fase: 'CRIADO', mercadopago_id: null
          } as any)
          if (insErr) throw insErr

          const client = new MercadoPagoConfig({ accessToken: mpToken, options: { idempotencyKey: correlation_id } })
          const payment = new Payment(client)
          
          const baseUrl = (env.WEBHOOK_BASE_URL || `https://${env.VERCEL_URL}` || 'https://prompt-curiosity.vercel.app').replace(/\/$/, '')
          const bypass = env.VERCEL_AUTOMATION_BYPASS_SECRET || ''
          const notification_url = bypass 
            ? `${baseUrl}/api/webhook-pix?x-vercel-protection-bypass=${bypass}`
            : `${baseUrl}/api/webhook-pix`

          console.log(`[CRIAR-PIX][${correlation_id}] url=${notification_url}`)

          const result = await payment.create({
            body: {
              transaction_amount: valor_brl,
              description: `Anti-Jegue - ${qtd} creditos`,
              payment_method_id: 'pix',
              payer: { email: `${device_id}@antijegue.com` },
              external_reference: txid,
              notification_url: notification_url,
            },
          } as any)

          await supabase.from('pagamentos_pix').update({
            mercadopago_id: String((result as any).id),
            fase: 'MP_CRIADO', raw_mp_response: result as any, updated_at: new Date().toISOString()
          } as any).eq('correlation_id', correlation_id)

          const pixData = (result as any).point_of_interaction?.transaction_data
          console.log(`[CRIAR-PIX][${correlation_id}] fase=MP_CRIADO mpId=${result.id}`)
          return Response.json({ id: result.id, txid, correlation_id, qr_code: pixData?.qr_code, qr_code_base64: pixData?.qr_code_base64, valor_brl, qtd_creditos: qtd })
        } catch (e: any) {
          console.error(`[CRIAR-PIX][${correlation_id}] fase=FALHA_MP`, e.message)
          try {
            const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
            await supa.from('pagamentos_pix').update({ fase: 'FALHA_MP', error_log: e.message, updated_at: new Date().toISOString() } as any).eq('correlation_id', correlation_id)
          } catch {}
          return Response.json({ error: e.message, correlation_id }, { status: 500 })
        }
      },
    },
  },
})

