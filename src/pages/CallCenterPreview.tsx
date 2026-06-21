import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NvoipAccountPanel from "@/components/discador/NvoipAccountPanel";
import { useWebphone } from "@/components/discador/WebphoneProvider";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";

interface CallCenterLead {
  id: string;
  name: string | null;
  phone: string | null;
  telefone: string | null;
  email: string | null;
  stage: string | null;
  source: string | null;
  tags: string[] | null;
  value: number | null;
}

const nvoipDialogTheme = {
  "--background": "225 28% 7%",
  "--foreground": "210 40% 96%",
  "--card": "224 24% 11%",
  "--card-foreground": "210 40% 96%",
  "--popover": "224 24% 11%",
  "--popover-foreground": "210 40% 96%",
  "--muted": "224 20% 16%",
  "--muted-foreground": "218 16% 68%",
  "--border": "220 18% 24%",
  "--input": "220 18% 24%",
  "--primary": "160 84% 39%",
  "--primary-foreground": "160 45% 8%",
  "--destructive": "0 72% 51%",
} as CSSProperties;

const CallCenterPreview = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [nvoipOpen, setNvoipOpen] = useState(false);
  const webphone = useWebphone();
  const webphoneCallOpen = ["outgoing", "ringing", "active"].includes(webphone.callState);

  const sendLeads = useCallback(async () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: role } = await supabase
      .from("user_roles")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!role?.company_id) return;

    const { data, error } = await supabase
      .from("leads")
      .select("id, name, phone, telefone, email, stage, source, tags, value")
      .eq("company_id", role.company_id)
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao carregar contatos do Call Center:", error);
      return;
    }

    const leads = ((data || []) as CallCenterLead[]).filter((lead) => lead.phone || lead.telefone);
    iframe.contentWindow.postMessage({ type: "call-center-leads", leads }, "*");
  }, []);

  useEffect(() => {
    const onMsg = async (event: MessageEvent) => {
      if (event.data?.type === "call-center-ready") sendLeads();
      if (event.data?.type === "call-center-open-nvoip") setNvoipOpen(true);
      if (event.data?.type === "call-center-start-call") {
        const { leadId, leadName, phone } = event.data;
        const number = phone ? String(phone) : "";
        const name = leadName ? String(leadName) : "Contato";
        let ok = false;

        try {
          if (webphone.mode !== "webphone" || !webphone.configured) {
            await webphone.reload();
          }

          if (webphone.mode !== "webphone" || !webphone.configured) {
            toast.error("Configure a Conta Nvoip no modo Webphone para ligar pelo navegador.");
            setNvoipOpen(true);
          } else if (webphone.regStatus !== "registered") {
            toast.error("Webphone SIP ainda não está conectado. Aguarde o status Online e tente novamente.");
          } else {
            webphone.call(number, name);
            ok = true;
          }
        } catch (error: any) {
          toast.error(error?.message || "Não foi possível iniciar a ligação pelo Webphone.");
        }

        iframeRef.current?.contentWindow?.postMessage({
          type: ok ? "call-center-call-started" : "call-center-call-failed",
          leadId,
          leadName,
          phone,
        }, "*");
      }
      if (event.data?.type === "call-center-end-call") {
        webphone.hangup();
      }
    };

    window.addEventListener("message", onMsg);
    sendLeads();

    const iframe = iframeRef.current;
    iframe?.addEventListener("load", sendLeads);
    return () => {
      window.removeEventListener("message", onMsg);
      iframe?.removeEventListener("load", sendLeads);
    };
  }, [sendLeads, webphone]);

  useEffect(() => {
    if (webphone.callState === "ended" || webphone.callState === "idle") {
      iframeRef.current?.contentWindow?.postMessage({ type: "call-center-call-ended" }, "*");
    }
  }, [webphone.callState]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  };

  const webphoneStatusText = (() => {
    if (webphone.callState === "active") return `Conectado - ${formatDuration(webphone.duration)}`;
    if (webphone.callState === "ringing" || webphone.callState === "outgoing") return "☎ Tocando...";
    return "☎ Chamando...";
  })();

  return (
    <div className="h-full w-full min-h-screen bg-background flex flex-col">
      <iframe
        ref={iframeRef}
        title="Call Center Preview"
        src="/call-center.html"
        style={{
          width: "100%",
          minHeight: "calc(100vh - 80px)",
          height: "100%",
          border: "0",
          background: "#0a0c0f",
        }}
      />
      <Dialog open={nvoipOpen} onOpenChange={setNvoipOpen}>
        <DialogContent
          className="w-[min(960px,calc(100vw-40px))] max-w-none max-h-[88vh] overflow-y-auto border-emerald-500/20 bg-background p-0 text-foreground shadow-2xl shadow-black/70"
          style={nvoipDialogTheme}
        >
          <DialogHeader className="border-b border-border bg-card/70 px-6 py-5">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Credenciais da Conta Nvoip
            </DialogTitle>
          </DialogHeader>
          <div className="bg-background px-6 py-5">
            <NvoipAccountPanel />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={webphoneCallOpen} onOpenChange={() => {}}>
        <DialogContent
          className="w-[min(472px,calc(100vw-24px))] max-w-none rounded-lg border-0 bg-[#111827] p-5 text-slate-50 shadow-2xl shadow-black/70 [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle className="text-center">Ligação em andamento</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
              <Phone className="h-8 w-8 text-blue-100" />
            </div>
            <div className="space-y-1 text-center">
              <div className="text-xl font-bold tracking-wide">{webphone.remoteNumber || "Contato"}</div>
              <div className="text-xs text-slate-400">↗ Saída — WebRTC</div>
              <div className="hidden text-sm font-medium text-blue-300">
                {webphone.callState === "active" && `Conectado · ${formatDuration(webphone.duration)}`}
              </div>
              <div className="text-sm font-medium text-blue-300">{webphoneStatusText}</div>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 pt-1">
              <Button
                variant={webphone.muted ? "default" : "outline"}
                className="h-9 border-slate-600 bg-transparent text-slate-50 hover:bg-slate-800"
                onClick={() => webphone.toggleMute()}
              >
                {webphone.muted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {webphone.muted ? "Silenciado" : "Microfone"}
              </Button>
              <Button className="h-9 bg-red-600 text-white hover:bg-red-700" onClick={() => webphone.hangup()}>
                <PhoneOff className="mr-2 h-4 w-4" />
                Encerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CallCenterPreview;
