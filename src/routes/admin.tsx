import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, RefreshCw } from "lucide-react";
import { getAdminDashboard, type AdminDashboard } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Backoffice — Anti-Jegue" },
      {
        name: "description",
        content:
          "Painel interno do Anti-Jegue: execuções, dispositivos, custo em dólar e feedbacks negativos.",
      },
      { property: "og:title", content: "Backoffice — Anti-Jegue" },
      {
        property: "og:description",
        content: "Painel interno de uso e custo das execuções do Anti-Jegue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Admin,
});

const STORAGE_KEY = "admin_key";

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Admin() {
  const load = useServerFn(getAdminDashboard);
  const [keyInput, setKeyInput] = useState("");
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (adminKey: string) => {
    setLoading(true);
    setErro(null);
    try {
      const res = await load({ data: { adminKey } });
      if (!res.ok) {
        setErro(res.message);
        setData(null);
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, adminKey);
        setData(res);
      }
    } catch {
      setErro("Não consegui carregar o painel. Tenta de novo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) void fetchData(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pt-16">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock className="h-4 w-4 text-primary" />
            Backoffice
          </div>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Chave de acesso"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
          <button
            type="button"
            disabled={loading || !keyInput}
            onClick={() => void fetchData(keyInput)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-neon px-4 py-3 text-sm font-semibold text-primary-foreground glow-neon disabled:opacity-40 disabled:shadow-none"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 pb-16 pt-10">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          Back<span className="text-gradient-neon">office</span>
        </h1>
        <button
          type="button"
          onClick={() => void fetchData(window.localStorage.getItem(STORAGE_KEY) ?? "")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Atualizar
        </button>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Execuções" value={String(data.totals.execucoes)} />
        <Card label="Dispositivos" value={String(data.totals.devices)} />
        <Card label="Custo total" value={`$${data.totals.custoUsd.toFixed(6)}`} />
        <Card label="Créditos restantes" value={String(data.totals.creditos)} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Últimas 20 execuções</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">Quando</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Modelo</th>
                <th className="px-3 py-2 font-medium">Tema</th>
                <th className="px-3 py-2 font-medium">Custo</th>
                <th className="px-3 py-2 font-medium">Device</th>
              </tr>
            </thead>
            <tbody>
              {data.execucoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                    Nenhuma execução registrada ainda.
                  </td>
                </tr>
              )}
              {data.execucoes.map((e) => (
                <tr key={e.id} className="border-b border-border/50 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-foreground">{e.tipo ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {e.modelo_usado ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{e.tema_extraido ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-primary">
                    ${(e.custo_usd ?? 0).toFixed(6)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {e.device_id ? `${e.device_id.slice(0, 8)}…` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Feedbacks negativos (nota ≤ 3)</h2>
        {data.feedbacks.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-4 text-xs text-muted-foreground">
            Nenhum feedback negativo até agora.
          </p>
        ) : (
          data.feedbacks.map((f) => (
            <div key={f.id} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">
                Nota {f.nota ?? "—"} · {new Date(f.created_at).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {f.o_que_faltou?.trim() || "Sem comentário."}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Custo diário</h2>
        {data.custoDiario ? (
          <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
            {data.custoDiario.map((d) => (
              <div key={d.dia} className="flex justify-between px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">{d.dia}</span>
                <span className="text-primary">${d.custo.toFixed(6)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-border bg-surface p-4 text-xs text-muted-foreground">
            {data.custoDiarioAviso}
          </p>
        )}
      </section>
    </main>
  );
}
