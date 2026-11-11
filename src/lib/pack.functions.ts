import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export interface PackProduto {
  id: string;
  titulo: string | null;
  prompt: string | null;
  categoria: string | null;
  preco: number | string | null;
}

function packClient() {
  // HARDCODE TEMPORARIO PRA TESTAR - depois voltamos pro ENV
  const url = "https://mcukxnxpiayitkjmvjnv.supabase.co";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jdWt4bnhwaWF5aXRram12am52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NjYyNDMsImV4cCI6MjEwMzQ0MjI0M30.kkJxDINHuEQZ73Qk5xdr1vNoLXm_4TtZcLpj4CaB65Q";

  console.log("[/pack] USANDO HARDCODE - url:", url.slice(0,30));

  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getPack = createServerFn({ method: "GET" }).handler(async (): Promise<PackProduto[]> => {
  const db = packClient();
  console.log("[/pack] tentando buscar produtos...");

  const { data: produtos, error: err2 } = await db
   .from("produtos")
   .select("id,titulo,prompt,categoria,preco")
   .eq("ativo", true)
   .order("categoria");

  if (err2) {
    console.error("[/pack] ERRO SUPABASE:", err2.message, err2);
    throw new Error(err2.message);
  }

  console.log("[/pack] SUCESSO - count:", produtos?.length, produtos?.[0]);
  return (produtos?? []) as PackProduto[];
});

export const registrarIntencao = createServerFn({ method: "POST" })
 .validator((input: unknown) => z.object({ produtoId: z.string() }).parse(input))
 .handler(async ({ data }) => {
    try {
      const db = packClient();
      await db.from("intencoes_compra").insert({ produto_id: data.produtoId, etapa: "click_copiar" });
    } catch (e) {
      console.error("intencoes_compra insert falhou", e);
    }
    return { ok: true };
  });

export const enviarAvaliacao = createServerFn({ method: "POST" })
 .validator((input: unknown) =>
    z.object({ produtoId: z.string(), nota: z.number().int().min(1).max(5), comentario: z.string().optional() }).parse(input),
  )
 .handler(async ({ data }) => {
    try {
      const db = packClient();
      await db.from("avaliacoes_clientes").insert({ produto_id: data.produtoId, nota: data.nota, comentario: data.comentario?.trim() || null });
    } catch (e) {
      console.error("avaliacoes_clientes insert falhou", e);
    }
    return { ok: true };
  });