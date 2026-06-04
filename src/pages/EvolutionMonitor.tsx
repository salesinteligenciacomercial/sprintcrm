import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Download, Power, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type State = {
  current_version: string | null;
  latest_available_version: string | null;
  last_check_at: string | null;
  last_restart_at: string | null;
  last_status: string | null;
};

type HistoryRow = {
  id: string;
  old_version: string | null;
  new_version: string | null;
  status_before: string | null;
  status_after: string | null;
  success: boolean;
  error: string | null;
  trigger: string;
  created_at: string;
};

export default function EvolutionMonitor() {
  const [state, setState] = useState<State | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [isSuper, setIsSuper] = useState<boolean | null>(null);

  async function refresh() {
    const [{ data: s }, { data: h }] = await Promise.all([
      supabase.from("evolution_version_state").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("evolution_version_history").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setState(s as any);
    setHistory((h as any) || []);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsSuper(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsSuper((data || []).some((r: any) => r.role === "super_admin"));
    })();
    refresh();
  }, []);

  async function run(action: "check" | "update" | "restart" | "test") {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("evolution-version-updater", { body: { action, trigger: "manual" } });
      if (error) throw error;
      toast({ title: `Ação "${action}" executada`, description: JSON.stringify(data).slice(0, 200) });
      await refresh();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || String(e), variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  if (isSuper === false) return <div className="p-6 text-muted-foreground">Acesso restrito a super administradores.</div>;
  if (isSuper === null) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const needsUpdate = !!(state?.current_version && state?.latest_available_version && state.current_version !== state.latest_available_version);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Monitor Evolution API</h1>
        <p className="text-sm text-muted-foreground">Atualização automática da versão do WhatsApp Web</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Estado atual</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Versão configurada</div>
            <div className="font-mono">{state?.current_version || "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Última disponível</div>
            <div className="font-mono">{state?.latest_available_version || "—"}</div>
            {needsUpdate && <Badge variant="destructive" className="mt-1">Atualização disponível</Badge>}
          </div>
          <div>
            <div className="text-muted-foreground">Status instância</div>
            <div>{state?.last_status || "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Última verificação</div>
            <div>{state?.last_check_at ? format(new Date(state.last_check_at), "dd/MM HH:mm", { locale: ptBR }) : "—"}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run("check")} disabled={!!loading} variant="outline">
          {loading === "check" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Verificar versão agora
        </Button>
        <Button onClick={() => run("update")} disabled={!!loading}>
          {loading === "update" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          Atualizar versão agora
        </Button>
        <Button onClick={() => run("restart")} disabled={!!loading} variant="outline">
          {loading === "restart" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Power className="h-4 w-4 mr-2" />}
          Reiniciar Evolution API
        </Button>
        <Button onClick={() => run("test")} disabled={!!loading} variant="outline">
          {loading === "test" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
          Testar conexão
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Histórico (últimas 20 execuções)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-3">Quando</th>
                  <th className="pr-3">Origem</th>
                  <th className="pr-3">De</th>
                  <th className="pr-3">Para</th>
                  <th className="pr-3">Status antes → depois</th>
                  <th className="pr-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Sem registros ainda.</td></tr>
                )}
                {history.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{format(new Date(h.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}</td>
                    <td className="pr-3">{h.trigger}</td>
                    <td className="pr-3 font-mono">{h.old_version || "—"}</td>
                    <td className="pr-3 font-mono">{h.new_version || "—"}</td>
                    <td className="pr-3">{(h.status_before || "—")} → {(h.status_after || "—")}</td>
                    <td className="pr-3">
                      {h.success
                        ? <Badge variant="default">OK</Badge>
                        : <Badge variant="destructive" title={h.error || ""}>Falha</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
