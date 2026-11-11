// src/lib/credits.server.ts - VERSÃO FINAL CORRIGIDA
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const env = process.env as any;
  const url = env['SUPABASE_URL'] || env['VITE_SUPABASE_URL'];
  const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['SUPABASE_SERVICE_KEY'];
  if (!url || !key) throw new Error("SUPABASE SERVICE_ROLE missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function ensureUser(deviceId: string) {
  const supa = supabaseAdmin();
  const { data: existing } = await supa.from("users").select("*").eq("device_id", deviceId).maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supa.from("users").insert({
    device_id: deviceId,
    credits: 10,
  }).select("*").single();

  if (error) {
    // race condition: outra aba criou no mesmo segundo
    const { data: retry } = await supa.from("users").select("*").eq("device_id", deviceId).single();
    if (retry) return retry;
    console.error("ensureUser", error);
    throw error;
  }
  return created;
}

export async function chargeCredit(deviceId: string) {
  const supa = supabaseAdmin();
  const { data: user } = await supa.from('users').select('credits').eq('device_id', deviceId).single();
  if (!user || (user.credits ?? 0) <= 0) throw new Error("SEM_CREDITOS");
  const newVal = (user.credits ?? 0) - 1;
  await supa.from('users').update({ credits: newVal }).eq('device_id', deviceId);
  return newVal;
}

export async function addCredits(deviceId: string, amount: number) {
  const supa = supabaseAdmin();
  const { data } = await supa.from('users').select('credits').eq('device_id', deviceId).single();
  if (!data) return;
  await supa.from('users').update({ credits: (data.credits ?? 0) + amount }).eq('device_id', deviceId);
}