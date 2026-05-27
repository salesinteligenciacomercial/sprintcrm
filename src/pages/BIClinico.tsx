import { useBIClinico } from "@/hooks/useBIClinico";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Users, Calendar, UserCheck, Activity, RefreshCcw } from "lucide-react";

interface KPI {
  label: string;
  value: string;
  hint?: string;
  icon: any;
  tone?: "good" | "warn" | "bad" | "neutral";
}

function KPICard({ kpi }: { kpi: KPI }) {
  const toneCls = {
    good: "text-green-500",
    warn: "text-yellow-500",
    bad: "text-red-500",
    neutral: "text-primary",
  }[kpi.tone ?? "neutral"];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          {kpi.label}
          <kpi.icon className={`h-4 w-4 ${toneCls}`} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${toneCls}`}>{kpi.value}</div>
        {kpi.hint && <p className="text-xs text-muted-foreground mt-1">{kpi.hint}</p>}
      </CardContent>
    </Card>
  );
}

function FunilVisual({
  pacientes, agendados, compareceram, procedimentos,
}: { pacientes: number; agendados: number; compareceram: number; procedimentos: number }) {
  const max = Math.max(pacientes, 1);
  const bar = (val: number, color: string, label: string) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{val}</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${(val / max) * 100}%` }} />
      </div>
    </div>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Funil Pacientes → Procedimento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bar(pacientes, "bg-slate-400", "Pacientes (total)")}
        {bar(agendados, "bg-blue-500", "Agendaram")}
        {bar(compareceram, "bg-green-500", "Compareceram")}
        {bar(procedimentos, "bg-emerald-600", "Fizeram procedimento")}
      </CardContent>
    </Card>
  );
}

export default function BIClinico() {
  const data = useBIClinico();

  const alertas: { text: string; level: "bad" | "warn" }[] = [];
  if (data.showRate > 0 && data.showRate < 70) alertas.push({ text: `Taxa de comparecimento baixa (${data.showRate}%) — reforce confirmações`, level: "bad" });
  if (data.totalPacientes > 0 && (data.totalNoShow / Math.max(data.totalPacientes, 1)) > 0.2) alertas.push({ text: "No-show alto — acione a sequência de resgate", level: "warn" });
  if (data.totalProcedimentos > 0 && data.taxaRetorno < 30) alertas.push({ text: `Taxa de retorno baixa (${data.taxaRetorno}%) — pacientes não voltam`, level: "warn" });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" /> BI Clínico
          </h1>
          <p className="text-sm text-muted-foreground">
            Indicadores de agendamento, comparecimento, procedimento e retorno
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={data.reload} disabled={data.loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${data.loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {alertas.length > 0 && (
        <Card className="border-orange-500/40 bg-orange-500/5">
          <CardContent className="pt-6 space-y-2">
            {alertas.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <AlertTriangle className={`h-4 w-4 ${a.level === "bad" ? "text-red-500" : "text-yellow-500"}`} />
                {a.text}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard kpi={{ label: "Taxa Agendamento", value: `${data.taxaAgendamento}%`, icon: Calendar, tone: data.taxaAgendamento >= 30 ? "good" : "warn" }} />
        <KPICard kpi={{ label: "Show Rate", value: `${data.showRate}%`, hint: "compareceram / agendaram", icon: UserCheck, tone: data.showRate >= 70 ? "good" : data.showRate >= 50 ? "warn" : "bad" }} />
        <KPICard kpi={{ label: "Taxa Procedimento", value: `${data.taxaProcedimento}%`, icon: Activity, tone: data.taxaProcedimento >= 50 ? "good" : "warn" }} />
        <KPICard kpi={{ label: "Ticket Médio", value: `R$ ${data.ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: TrendingUp, tone: "neutral" }} />
        <KPICard kpi={{ label: "Taxa Retorno", value: `${data.taxaRetorno}%`, icon: RefreshCcw, tone: data.taxaRetorno >= 30 ? "good" : "warn" }} />
        <KPICard kpi={{ label: "Recuperação No-show", value: `${data.taxaRecuperacaoNoShow}%`, hint: `${data.totalRecuperados} resgatados`, icon: TrendingDown, tone: data.taxaRecuperacaoNoShow >= 30 ? "good" : "warn" }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FunilVisual
          pacientes={data.totalPacientes}
          agendados={data.totalAgendados}
          compareceram={data.totalCompareceram}
          procedimentos={data.totalProcedimentos}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Volumes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total de pacientes</span><Badge variant="secondary">{data.totalPacientes}</Badge></div>
            <div className="flex justify-between"><span>Em pós-consulta / retorno</span><Badge variant="secondary">{data.totalRetornos}</Badge></div>
            <div className="flex justify-between"><span>Faltaram (no-show)</span><Badge variant="destructive">{data.totalNoShow}</Badge></div>
            <div className="flex justify-between"><span>Recuperados após faltar</span><Badge className="bg-green-600">{data.totalRecuperados}</Badge></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
