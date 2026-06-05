import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Módulo Tarefas — Opção B
 * Mantém o visual 100% do mockup (public/tarefas.html) e injeta a sessão
 * via postMessage para o script do iframe se conectar ao Lovable Cloud.
 */
const Tarefas = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const sendSession = async () => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (!s) return;
      iframe.contentWindow.postMessage(
        {
          type: "tarefas-init",
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          accessToken: s.access_token,
          refreshToken: s.refresh_token,
          userId: s.user.id,
        },
        "*"
      );
    };

    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === "tarefas-ready") sendSession();
      if (ev.data?.type === "tarefas-open-whatsapp") {
        const { phone, leadId } = ev.data;
        const params = new URLSearchParams();
        if (phone) params.set("phone", String(phone));
        if (leadId) params.set("lead", String(leadId));
        window.location.href = `/conversas?${params.toString()}`;
      }
    };
    window.addEventListener("message", onMsg);

    const iframe = iframeRef.current;
    iframe?.addEventListener("load", sendSession);
    return () => {
      window.removeEventListener("message", onMsg);
      iframe?.removeEventListener("load", sendSession);
    };
  }, []);

  return (
    <div className="h-full w-full min-h-screen bg-background flex flex-col">
      <iframe
        ref={iframeRef}
        src="/tarefas.html"
        title="Tarefas"
        style={{
          width: "100%",
          minHeight: "calc(100vh - 80px)",
          border: 0,
          background: "#0b0e14",
        }}
      />
    </div>
  );
};

export default Tarefas;
