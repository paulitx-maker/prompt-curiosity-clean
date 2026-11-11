import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/ensure-user')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { device_id } = await request.json().catch(()=>({})) as any
        if(!device_id) return Response.json({error:'missing'},{status:400})
        const env = process.env as any
        const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
        const key = env.SUPABASE_SERVICE_ROLE_KEY
        if(!url || !key) return Response.json({error:'env_missing'},{status:500})
        const admin = createClient(url, key, { auth: { persistSession: false } })

        // F1 VALIDADO: unifica em 3 créditos na entrada, maybeSingle para evitar 500
        let { data, error: selErr } = await admin.from('users').select('*').eq('device_id', device_id).maybeSingle()
        if(selErr) console.warn('[ensure-user] select warn', selErr.message)
        if(!data){
          const ins = await admin.from('users').insert({ device_id, credits: 3, creditos: 3 }).select().maybeSingle()
          if(ins.error){
            // race condition entre abas, tenta ler de novo
            const retry = await admin.from('users').select('*').eq('device_id', device_id).maybeSingle()
            data = retry.data
            if(!data) return Response.json({error:ins.error.message},{status:500})
          } else {
            data = ins.data
          }
        }

        // limite MAX 400 créditos total (regra D15)
        if((data as any).credits > 400){
          await admin.from('users').update({ credits: 400, creditos: 400 }).eq('device_id', device_id)
          ;(data as any).credits = 400
        }

        // contador real de hoje vem do server, client nunca conta direto
        const hoje = new Date().toISOString().slice(0,10)
        const { count, error: cntErr } = await admin.from("executions")
          .select("*", { count: "exact", head: true })
          .eq("device_id", device_id)
          .gte("created_at", `${hoje}T00:00:00`)
        if(cntErr) console.warn('[ensure-user] count warn', cntErr.message)

        // renovação 1 por dia: se não tem execução hoje e last_seen >24h, +1 crédito (max 400)
        // last_seen pode estar em users.updated_at
        const last = (data as any).updated_at ? new Date((data as any).updated_at) : null
        const now = new Date()
        if(last && (now.getTime() - last.getTime()) > 24*60*60*1000 && ((data as any).credits < 3)){
          const novo = Math.min(3, (data as any).credits + 1)
          await admin.from('users').update({ credits: novo, creditos: novo, updated_at: now.toISOString() }).eq('device_id', device_id)
          ;(data as any).credits = novo
        }

        return Response.json({ ...data, usadoHoje: count ?? 0 })
      }
    }
  }
})

