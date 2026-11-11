// src/lib/antijegue.server.ts - FINAL DEFINITIVO (antigo + 4 bugs do Claude) + FIX 429
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const env = process.env as any;
  const url = env['SUPABASE_URL'] || env['VITE_SUPABASE_URL'];
  const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['SUPABASE_SERVICE_KEY'];
  if (!url ||!key) throw new Error("SUPABASE keys missing - use SERVICE_ROLE");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function checkLimite10(deviceId: string) {
  const supa = supabaseAdmin();
  const hoje = `${new Date().toISOString().slice(0,10)}T00:00:00`;
  const { count } = await supa.from("executions")
  .select("*", { count: "exact", head: true })
  .eq("device_id", deviceId)
  .gte("created_at", hoje);
  if ((count || 0) >= 10) throw new Error("LIMITE");
}

async function cobraCreditoRPC(deviceId: string, custoUsd: number) {
  const supa = supabaseAdmin();
  const { data, error } = await supa.rpc("charge_credit", { _device_id: deviceId, _custo: custoUsd });
  if (error) {
    console.error("[cobraCreditoRPC] erro real do Postgres:", error.message);
    throw new Error(`CHARGE_ERROR: ${error.message}`);
  }
  if (data === null) throw new Error("SEM_CREDITO");
  return data as number;
}

export async function ensureUser(deviceId: string) {
  const supa = supabaseAdmin();
  const { data: existing } = await supa.from("users").select("*").eq("device_id", deviceId).maybeSingle();
  if (existing) return existing;
  const { data: created, error } = await supa.from("users").insert({ device_id: deviceId, credits: 10, total_gasto_usd: 0 }).select("*").single();
  if (error) {
    const { data: retry } = await supa.from("users").select("*").eq("device_id", deviceId).maybeSingle();
    if (retry) return retry;
    throw error;
  }
  if (!created) throw new Error("ensureUser falhou");
  return created;
}

export async function logExecution(data: any) {
  const supa = supabaseAdmin();
  const payload = {
    device_id: data.deviceId, user_id: data.userId || null, tipo: data.tipo,
    file_name: data.fileName?? null, modelo_usado: data.modeloUsado,
    custo_usd: data.custoUsd?? 0, tema_extraido: data.temaExtraido?? null,
    prompt_final: data.promptFinal?? null, post_gerado: data.postGerado?? null,
    transcricao: data.transcricao?? null, resumo: data.resumo?? null,
    pode_usar_publico: data.podeUsarPublico?? false,
  };
  const { data: row, error } = await supa.from("executions").insert(payload).select("id").single();
  if (error) { console.error("logExecution", error, payload); throw error; }
  if (!row) throw new Error("logExecution retornou null");
  return row.id;
}

export async function saveFeedback(executionId: string, deviceId: string, nota: number, oQueFaltou?: string) {
  const supa = supabaseAdmin();
  const { error } = await supa.from("feedbacks").insert({ execution_id: executionId, device_id: deviceId, nota, o_que_faltou: oQueFaltou?? null });
  if (error) { console.error("saveFeedback", error); return false; }
  return true;
}

export async function updateConsent(executionId: string, podeUsar: boolean) {
  const supa = supabaseAdmin();
  const { error } = await supa.from("executions").update({ pode_usar_publico: podeUsar }).eq("id", executionId);
  if (error) { console.error("updateConsent", error); return false; }
  return true;
}

async function callOpenRouter(prompt: string, imageBase64?: string) {
  const env = process.env as any;
  const apiKey = env['OPENROUTER_API_KEY'] || env['VITE_OPENROUTER_API_KEY'];
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing no.env");
  const content = imageBase64
  ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageBase64.startsWith('data:')? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } }]
    : prompt;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://antijegue.app", "X-Title": "AntiJegue MVP" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content }], provider: { allow_fallbacks: false } })
  });
  if (!res.ok) { const t = await res.text(); console.error("OpenRouter FAIL", res.status, t); throw new Error(`AI_PROVIDER_ERROR ${res.status} ${t.slice(0,300)}`); }
  const json = await res.json();
  return { text: json.choices?.[0]?.message?.content?? "", usage: json.usage };
}

export async function runPostImagem(data: any) {
  let chargeLogId: string | null = null;
  let custoCobrado = 0.0006;
  let custoAplicado = custoCobrado;
  const deviceId = data.deviceId;
  try {
    if (!deviceId) return { ok: false, message: "deviceId missing" };
    const image = data.imageBase64 || data.fileBase64;
    if (!image) return { ok: false, message: "imageBase64 missing" };
    if (image.length > 10_000_000) return { ok: false, message: "file_too_large" };
    if (!process.env.OPENROUTER_API_KEY &&!(process.env as any).VITE_OPENROUTER_API_KEY) return { ok: false, message: "missing_api_key" };

    await checkLimite10(deviceId);
    const user = await ensureUser(deviceId);
    if ((user.credits?? 0) <= 0) return { ok: false, message: "SEM_CREDITO" };

    const saldoAntes = await cobraCreditoRPC(deviceId, custoCobrado);
    const { data: logRow } = await supabaseAdmin().from("charge_log").insert({ device_id: deviceId, custo: custoCobrado, tipo: "foto_post", estornado: false }).select("id").single();
    chargeLogId = logRow?.id?? null;

    const prompt = `Você é copywriter anti-jegue. Crie um POST para ${data.answers.plataforma} com tom ${data.answers.tom}. Objetivo: ${data.answers.manterTexto}. Regras: sem jargão, frases curtas, CTA no final. Arquivo: ${data.fileName}. Responda só o post pronto em PT-BR.`;
    const result = await callOpenRouter(prompt, image);

    const custoReal = result.usage? (result.usage.prompt_tokens * 0.00000025 + result.usage.completion_tokens * 0.0000015) : custoCobrado;
    if (Math.abs(custoReal - custoCobrado) > 0.0000001) {
      await supabaseAdmin().rpc("ajusta_custo", { _device_id: deviceId, _delta: custoReal - custoCobrado });
      custoAplicado = custoReal;
    }

    const execId = await logExecution({ deviceId, userId: user.id, fileName: data.fileName, tipo: "foto_post", modeloUsado: "google/gemini-2.5-flash-lite", custoUsd: custoReal, temaExtraido: data.answers.plataforma, promptFinal: prompt, postGerado: result.text });
    return { ok: true, executionId: execId, post: result.text, post_gerado: result.text, custo_estimado: custoReal, custo_usd: custoReal, creditosRestantes: saldoAntes, credits: saldoAntes };
  } catch (e: any) {
    if (e.message === "LIMITE" || e.message === "SEM_CREDITO") return { ok: false, message: e.message };

    // 429 OpenRouter / rate limit - mapeia para mensagem amigável
    const isProviderOverload = e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("AI_PROVIDER") || e?.message?.includes("overloaded");

    if (chargeLogId) {
      await supabaseAdmin().from("charge_log").update({ estornado: true }).eq("id", chargeLogId);
      await supabaseAdmin().rpc("refund_credit", { _device_id: deviceId });
      await supabaseAdmin().rpc("ajusta_custo", { _device_id: deviceId, _delta: -custoAplicado });
    }

    if (isProviderOverload) {
      return {
        ok: false,
        message: "AI_PROVIDER_ERROR",
        error: "O modelo de IA que usamos está sobrecarregado agora. Seu crédito não foi cobrado - tenta de novo em 1 minuto."
      };
    }

    throw e;
  }
}

export async function runAudioResumo(data: any) {
  let chargeLogId: string | null = null;
  let custoCobrado = 0.0008;
  let custoAplicado = custoCobrado;
  const deviceId = data.deviceId;
  try {
    if (!deviceId) return { ok: false, message: "deviceId missing" };
    await checkLimite10(deviceId);
    const user = await ensureUser(deviceId);
    if ((user.credits?? 0) <= 0) return { ok: false, message: "SEM_CREDITO" };

    const saldoAntes = await cobraCreditoRPC(deviceId, custoCobrado);
    const { data: logRow } = await supabaseAdmin().from("charge_log").insert({ device_id: deviceId, custo: custoCobrado, tipo: "audio_resumo", estornado: false }).select("id").single();
    chargeLogId = logRow?.id?? null;

    const prompt = `Transcreva e resuma este áudio: ${data.fileName}. Tipo de resumo: ${data.answers.resultado}, Qtd pessoas: ${data.answers.numeroPessoas}, Ruído: ${data.answers.ruido}. Formato: Transcrição literal + Resumo em tópicos. PT-BR.`;
    const result = await callOpenRouter(prompt);

    const custoReal = result.usage? (result.usage.prompt_tokens * 0.00000025 + result.usage.completion_tokens * 0.0000015) : custoCobrado;
    if (Math.abs(custoReal - custoCobrado) > 0.0000001) {
      await supabaseAdmin().rpc("ajusta_custo", { _device_id: deviceId, _delta: custoReal - custoCobrado });
      custoAplicado = custoReal;
    }

    const execId = await logExecution({ deviceId, userId: user.id, fileName: data.fileName, tipo: "audio_resumo", modeloUsado: "google/gemini-2.5-flash-lite", custoUsd: custoReal, temaExtraido: data.answers.numeroPessoas, promptFinal: prompt, transcricao: result.text.slice(0,4000), resumo: result.text });
    return { ok: true, executionId: execId, transcricao: result.text.slice(0,4000), resumo: result.text, custo_estimado: custoReal, custo_usd: custoReal, creditosRestantes: saldoAntes, credits: saldoAntes };
  } catch (e: any) {
    if (e.message === "LIMITE" || e.message === "SEM_CREDITO") return { ok: false, message: e.message };

    // 429 OpenRouter / rate limit - mapeia para mensagem amigável
    const isProviderOverload = e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("AI_PROVIDER") || e?.message?.includes("overloaded");

    if (chargeLogId) {
      await supabaseAdmin().from("charge_log").update({ estornado: true }).eq("id", chargeLogId);
      await supabaseAdmin().rpc("refund_credit", { _device_id: deviceId });
      await supabaseAdmin().rpc("ajusta_custo", { _device_id: deviceId, _delta: -custoAplicado });
    }

    if (isProviderOverload) {
      return {
        ok: false,
        message: "AI_PROVIDER_ERROR",
        error: "O modelo de IA que usamos está sobrecarregado agora. Seu crédito não foi cobrado - tenta de novo em 1 minuto."
      };
    }

    throw e;
  }
}

export async function runEnviarFeedback(data: any) {
  const { executionId, deviceId, nota, oQueFaltou, podeUsarPublico } = data;
  if (podeUsarPublico!== undefined) await updateConsent(executionId, podeUsarPublico);
  const ok = await saveFeedback(executionId, deviceId, nota, oQueFaltou);
  return { ok };
}