import { useEffect, useState } from "react";

type Props = {
  credits?: number;
  usedToday?: number;
  limitToday?: number;
  deviceId?: string;
};

export function CreditsBadge({ credits: initialCredits, usedToday: propUsedToday = 0, limitToday = 10, deviceId }: Props) {
  const [credits, setCredits] = useState<number | null>(null);
  const [usedToday, setUsedToday] = useState(propUsedToday);

  useEffect(()=>{ setUsedToday(propUsedToday); },[propUsedToday]);

  useEffect(() => {
    const id = deviceId || (() => {
      try { return localStorage.getItem("device_id") || ""; } catch { return ""; }
    })();
    if (!id || id === "web") return;

    const fetchCredits = async () => {
      try {
        const res = await fetch("/api/ensure-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: id })
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.credits === 'number') setCredits(data.credits);
          if (typeof data.usadoHoje === 'number') setUsedToday(data.usadoHoje);
          return;
        }
        const url = (import.meta as any).env?.VITE_SUPABASE_URL;
        const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_KEY;
        if (url && anon) {
          const r = await fetch(`${url}/rest/v1/users?device_id=eq.${id}&select=credits&limit=1`, {
            headers: { apikey: anon, Authorization: `Bearer ${anon}` }
          });
          if (r.ok) {
            const d = await r.json();
            if (d[0]?.credits!== undefined) setCredits(d[0].credits);
          }
        }
      } catch {}
    };

    fetchCredits();

    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail && typeof ce.detail.credits === "number") {
        setCredits(ce.detail.credits);
      } else if (ce.detail && typeof ce.detail.delta === "number") {
        setCredits((prev) => Math.max(0, (prev?? 0) + ce.detail.delta));
      }
      if (ce.detail && typeof ce.detail.usadoHoje === 'number') {
        setUsedToday(ce.detail.usadoHoje);
      }
    };
    window.addEventListener("credits-updated" as any, handler);
    return () => window.removeEventListener("credits-updated" as any, handler);
  }, [deviceId]);

  const display = credits?? initialCredits?? 0;

  return (
    <div className="inline-flex items-center rounded-full bg-[#FF6B00]/90 backdrop-blur border border-[#FF6B00]/20 px- py- shadow-[0_2px_12px_rgba(255,107,0,0.25)]">
      <span className="text- mr-1.5">⚡</span>
      <span className="text- font-extrabold text-white">{display}</span>
      <span className="text- font-semibold ml-1 text-white">créditos</span>
      <span className="mx-2 text- font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>|</span>
      <span className="text- font-bold" style={{ color: '#1A1A1A' }}>
        {usedToday}/{limitToday} hoje
      </span>
    </div>
  );
}