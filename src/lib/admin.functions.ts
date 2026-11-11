import { createServerFn } from "@tanstack/react-start";

export interface AdminExecutionRow {
  id: string;
  created_at: string;
  tipo: string | null;
  modelo_usado: string | null;
  tema_extraido: string | null;
  custo_usd: number | null;
  device_id: string | null;
}

export interface AdminFeedbackRow {
  id: string;
  created_at: string;
  nota: number | null;
  o_que_faltou: string | null;
  execution_id: string | null;
}

export interface AdminDashboard {
  ok: true;
  totals: {
    execucoes: number;
    devices: number;
    custoUsd: number;
    creditos: number;
  };
  execucoes: AdminExecutionRow[];
  feedbacks: AdminFeedbackRow[];
  custoDiario: Array<{ dia: string; custo: number }> | null;
  custoDiarioAviso: string | null;
}

export type AdminResult = AdminDashboard | { ok: false; message: string };

export const getAdminDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: { adminKey: string }) => input)
  .handler(async ({ data }): Promise<AdminResult> => {
    const { runAdminDashboard } = await import("./admin.server");
    return runAdminDashboard(data.adminKey);
  });
