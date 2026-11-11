import { createClient } from '@supabase/supabase-js';
import type {
  AdminExecutionRow,
  AdminFeedbackRow,
  AdminResult,
} from "./admin.functions";

function getSupabaseAdmin() {
  const env = process.env as any;
  const url = env['SUPABASE_URL'] || env['VITE_SUPABASE_URL'];
  const key = env['SUPABASE_SERVICE_ROLE_KEY'];
  return createClient(url, key);
}


export async function runAdminDashboard(adminKey: string): Promise<AdminResult> {
  const expected = process.env["ADMIN_ACCESS_KEY"];
  if (!expected) {
    return { ok: false, message: "ADMIN_ACCESS_KEY não está configurada no backend." };
  }
  if (!adminKey || adminKey !== expected) {
    return { ok: false, message: "Chave de acesso inválida." };
  }

  const supabaseAdmin = getSupabaseAdmin();

  const [usersRes, execCountRes, execRowsRes, feedbackRes] = await Promise.all([
    supabaseAdmin.from("users").select("id, device_id, credits"),
    supabaseAdmin.from("executions").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("executions")
      .select("id, created_at, tipo, modelo_usado, tema_extraido, custo_usd, user_id")
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("feedbacks")
      .select("id, created_at, nota, o_que_faltou, execution_id")
      .lte("nota", 3)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const users = usersRes.data ?? [];
  const deviceById = new Map(users.map((u: any) => [u.id, u.device_id]));
  const allExecs = execRowsRes.data ?? [];

  const custoUsd = allExecs.reduce((sum: number, e: any) => sum + Number(e.custo_usd ?? 0), 0);
  const creditos = users.reduce((sum: number, u: any) => sum + Number(u.credits ?? 0), 0);

  const execucoes: AdminExecutionRow[] = allExecs.slice(0, 20).map((e: any) => ({
    id: e.id,
    created_at: e.created_at,
    tipo: e.tipo,
    modelo_usado: e.modelo_usado,
    tema_extraido: e.tema_extraido ? e.tema_extraido.slice(0, 80) : null,
    custo_usd: e.custo_usd === null ? null : Number(e.custo_usd),
    device_id: e.user_id ? (deviceById.get(e.user_id) ?? null) : null,
  }));

  const feedbacks: AdminFeedbackRow[] = (feedbackRes.data ?? []) as AdminFeedbackRow[];

  let custoDiario: Array<{ dia: string; custo: number }> | null = null;
  let custoDiarioAviso: string | null =
    "custo_ia está no Supabase externo — confira o painel do OpenRouter.";
  const viewRes = await supabaseAdmin
    .from("vw_custo_diario" as never)
    .select("*")
    .limit(30);
  if (!viewRes.error && Array.isArray(viewRes.data) && viewRes.data.length > 0) {
    custoDiario = (viewRes.data as Array<Record<string, unknown>>).map((r) => ({
      dia: String(r["dia"] ?? r["day"] ?? r["data"] ?? ""),
      custo: Number(r["custo"] ?? r["custo_usd"] ?? r["total"] ?? 0),
    }));
    custoDiarioAviso = null;
  }

  return {
    ok: true,
    totals: {
      execucoes: execCountRes.count ?? allExecs.length,
      devices: users.length,
      custoUsd: Number(custoUsd.toFixed(6)),
      creditos,
    },
    execucoes,
    feedbacks,
    custoDiario,
    custoDiarioAviso,
  };
}