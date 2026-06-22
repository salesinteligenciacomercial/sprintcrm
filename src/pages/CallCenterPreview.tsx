import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NvoipAccountPanel from "@/components/discador/NvoipAccountPanel";
import { useWebphone } from "@/components/discador/WebphoneProvider";
import { Button } from "@/components/ui/button";
import { Delete, Mic, MicOff, Phone, PhoneCall, PhoneOff, Radio } from "lucide-react";
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

const dialerKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

const CallCenterPreview = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [nvoipOpen, setNvoipOpen] = useState(false);
  const [dialerOpen, setDialerOpen] = useState(false);
  const [dialerNumber, setDialerNumber] = useState("");
  const webphone = useWebphone();
  const webphoneCallOpen = ["outgoing", "ringing", "active"].includes(webphone.callState);
  const webphoneReady = webphone.mode === "webphone" && webphone.configured && webphone.regStatus === "registered";
  const webphoneStatusLabel = webphoneReady ? "Pronto" : webphone.regStatus === "connecting" ? "Conectando" : "Offline";

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
      if (event.data?.type === "call-center-open-dialer") setDialerOpen(true);
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

  const handleDialerCall = async () => {
    const number = dialerNumber.replace(/\D/g, "");
    if (number.length < 10) {
      toast.error("Informe DDD + número para realizar a ligação.");
      return;
    }

    try {
      if (webphone.mode !== "webphone" || !webphone.configured) {
        await webphone.reload();
      }

      if (webphone.mode !== "webphone" || !webphone.configured) {
        toast.error("Configure a Conta Nvoip no modo Webphone para ligar pelo navegador.");
        setDialerOpen(false);
        setNvoipOpen(true);
        return;
      }

      if (webphone.regStatus !== "registered") {
        toast.error("Webphone SIP ainda não está conectado. Aguarde o status Pronto e tente novamente.");
        return;
      }

      webphone.call(number, number);
      setDialerOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível iniciar a ligação pelo Webphone.");
    }
  };

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
      <Dialog open={dialerOpen} onOpenChange={setDialerOpen}>
        <DialogContent className="w-[min(530px,calc(100vw-24px))] max-w-none gap-0 overflow-hidden rounded-xl border-slate-200 bg-slate-50 p-0 text-slate-950 shadow-2xl">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-950">
              <PhoneCall className="h-7 w-7 text-emerald-500" />
              Call Center
            </DialogTitle>
            <p className="text-sm font-normal text-slate-500">Softphone WebRTC — ligações diretas no navegador</p>
          </DialogHeader>

          <div className="border-b border-slate-200 bg-[#0f4445] px-4 py-3 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-300" />
                <span className="font-semibold">Webphone NVOIP</span>
                {webphone.sipNumber ? <span className="truncate text-sm text-slate-300">— {webphone.sipNumber}</span> : null}
              </div>
              <span className={`rounded-md px-3 py-1 text-xs font-semibold ${webphoneReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                ● {webphoneStatusLabel}
              </span>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              <input
                value={dialerNumber}
                onChange={(event) => setDialerNumber(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleDialerCall();
                }}
                placeholder="DDD + número"
                className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <Button
                className="h-10 w-12 bg-emerald-300 text-emerald-900 hover:bg-emerald-400"
                onClick={handleDialerCall}
                disabled={!dialerNumber.trim()}
                aria-label="Ligar"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {dialerKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="h-10 rounded-md border border-slate-200 bg-white text-base font-medium text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50"
                  onClick={() => setDialerNumber((current) => current + key)}
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className={`text-sm ${webphoneReady ? "text-emerald-600" : "text-amber-600"}`}>
                {webphoneReady ? "✓ Pronto — WSS registrado. Ligações saem direto pelo navegador." : "Aguardando registro WSS do Webphone."}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-slate-900"
                onClick={() => setDialerNumber((current) => current.slice(0, -1))}
                disabled={!dialerNumber}
              >
                <Delete className="mr-1 h-4 w-4" />
                Apagar
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span>›_ Diagnóstico SIP <span className={webphoneReady ? "text-emerald-500" : "text-red-500"}>●</span></span>
            <span>⌃</span>
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
