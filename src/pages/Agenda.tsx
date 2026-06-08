// 🔒 LOCKED: Render the official GROW OS Agenda mockup inside the app layout.
// Visual changes must be made in public/agenda.html — do NOT replace with old React components.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Agenda() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAndSend() {
      const [{ data: agendas }, { data: profs }] = await Promise.all([
        supabase.from("agendas").select("id, nome").order("nome"),
        supabase.from("profissionais").select("id, nome, especialidade").order("nome"),
      ]);
      if (cancelled) return;
      const payload = {
        type: "agenda:data",
        agendas: (agendas || []).map((a: any) => ({ id: a.id, label: a.nome })),
        profissionais: (profs || []).map((p: any) => ({
          id: p.id,
          label: p.especialidade ? `${p.nome} — ${p.especialidade}` : p.nome,
        })),
      };
      iframeRef.current?.contentWindow?.postMessage(payload, "*");
    }

    function onMessage(e: MessageEvent) {
      if (e.data?.type === "agenda:ready") loadAndSend();
    }
    window.addEventListener("message", onMessage);
    // tenta também após load do iframe
    const t = setTimeout(loadAndSend, 800);
    return () => {
      cancelled = true;
      window.removeEventListener("message", onMessage);
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="w-full h-[calc(100vh-7rem)] min-h-[640px] overflow-hidden rounded-lg border border-border bg-background">
      <iframe
        ref={iframeRef}
        src="/agenda.html"
        title="Agenda — GROW OS"
        className="w-full h-full border-0 block"
      />
    </div>
  );
}
