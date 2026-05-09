import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  TrendingUp, DollarSign, Target, Megaphone, AlertTriangle, Zap, RefreshCw, Trophy, Flame, ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRevenueEngineMetrics } from "@/hooks/useRevenueEngineMetrics";

const PERIODS = [
  { value: 7, label: "Últimos 7 dias" },
  { value: 14, label: "Últimos 14 dias" },
  { value: 30, label: "Últimos 30 dias" },
  { value: 90, label: "Últimos 90 dias" },
];

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v || 0);

export default function RevenueEngine() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_my_company_id");
      setCompanyId(data as any);
    })();
  }, []);

  const { summary, campaigns, bottlenecks, loading, error, reload } =
    useRevenueEngineMetrics(companyId, days);

  // Aggregate funnel from all campaigns
  const funnelTotals = campaigns.reduce(
    (acc, c) => ({
      novos: acc.novos + Number(c.novos || 0),
      em_contato: acc.em_contato + Number(c.em_contato || 0),
      qualificados: acc.qualificados + Number(c.qualificados || 0),
      agendados: acc.agendados + Number(c.agendados || 0),
      ganhos: acc.ganhos + Number(c.ganhos || 0),
      perdidos: acc.perdidos + Number(c.perdidos || 0),
    }),
    { novos: 0, em_contato: 0, qualificados: 0, agendados: 0, ganhos: 0, perdidos: 0 }
  );

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + Number(c.receita_total || 0), 0);
  const globalRoi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
  const globalCpl = (summary?.leads_pagos || 0) > 0 ? totalSpend / (summary!.leads_pagos) : 0;

  const topCampaign = [...campaigns].sort((a, b) => Number(b.receita_total) - Number(a.receita_total))[0];
  const worstCampaign = [...campaigns].filter(c => c.total_leads >= 5 && c.taxa_conversao !== undefined)
    .sort((a, b) => Number(a.taxa_conversao) - Number(b.taxa_conversao))[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">Revenue Engine</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Rastreamento end-to-end de leads — da campanha ao fechamento. Onde está o dinheiro deixado na mesa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={reload} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Target className="h-4 w-4 text-primary" />}
          label="Leads no período"
          value={fmtNum(summary?.total_leads || 0)}
          sub={`${fmtNum(summary?.leads_pagos || 0)} pagos · ${fmtNum(summary?.leads_organicos || 0)} orgânicos`}
        />
        <KpiCard
          icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          label="Receita gerada"
          value={fmtBRL(summary?.receita_total || 0)}
          sub={`Ticket médio: ${fmtBRL(summary?.ticket_medio || 0)}`}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
          label="Taxa de conversão"
          value={`${(summary?.taxa_conversao || 0).toFixed(1)}%`}
          sub={`${fmtNum(summary?.ganhos || 0)} ganhos · ${fmtNum(summary?.perdidos || 0)} perdidos`}
        />
        <KpiCard
          icon={<Megaphone className="h-4 w-4 text-amber-500" />}
          label="ROI tráfego pago"
          value={totalSpend > 0 ? `${globalRoi.toFixed(0)}%` : "—"}
          sub={`Investido ${fmtBRL(totalSpend)} · CPL ${fmtBRL(globalCpl)}`}
          highlight={globalRoi > 100 ? "good" : globalRoi < 0 ? "bad" : undefined}
        />
      </div>

      {/* Funil agregado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDown className="h-4 w-4 text-primary" />
            Funil de conversão (todas as campanhas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelStrip totals={funnelTotals} />
        </CardContent>
      </Card>

      {/* Insights destacados */}
      <div className="grid gap-4 md:grid-cols-2">
        {topCampaign && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Trophy className="h-4 w-4" /> Campanha que mais converte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="font-semibold truncate">{topCampaign.campaign_name}</div>
              <div className="text-sm text-muted-foreground">
                {fmtNum(topCampaign.total_leads)} leads · {fmtNum(topCampaign.ganhos)} fechamentos ·{" "}
                <span className="text-emerald-500 font-medium">{fmtBRL(Number(topCampaign.receita_total))}</span>
              </div>
              {topCampaign.spend && topCampaign.spend > 0 && (
                <div className="text-xs text-muted-foreground">
                  ROI: <span className="font-medium">{((topCampaign.roi || 0) * 100).toFixed(0)}%</span> · Gasto {fmtBRL(topCampaign.spend)}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {worstCampaign && worstCampaign.campaign_key !== topCampaign?.campaign_key && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <Flame className="h-4 w-4" /> Onde você está queimando dinheiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="font-semibold truncate">{worstCampaign.campaign_name}</div>
              <div className="text-sm text-muted-foreground">
                {fmtNum(worstCampaign.total_leads)} leads, mas só{" "}
                <span className="text-destructive font-medium">{Number(worstCampaign.taxa_conversao).toFixed(1)}%</span> de conversão
              </div>
              <div className="text-xs text-muted-foreground italic">
                Antes de aumentar verba, qualifique melhor esses leads.
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabela de campanhas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-primary" />
            Performance por campanha ({campaigns.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {campaigns.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              {loading ? "Carregando…" : "Nenhuma campanha rastreada nesse período. Verifique se os webhooks de Meta Ads/CTWA estão chegando."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Agend.</TableHead>
                    <TableHead className="text-right">Ganhos</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.campaign_key}>
                      <TableCell>
                        <div className="font-medium truncate max-w-[280px]">{c.campaign_name}</div>
                        <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                          {c.source_type && <Badge variant="outline" className="text-[10px] py-0 h-4">{c.source_type}</Badge>}
                          {c.utm_source && <span>{c.utm_source}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{fmtNum(c.total_leads)}</TableCell>
                      <TableCell className="text-right">{fmtNum(c.agendados)}</TableCell>
                      <TableCell className="text-right text-emerald-500">{fmtNum(c.ganhos)}</TableCell>
                      <TableCell className="text-right">{Number(c.taxa_conversao).toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-medium">{fmtBRL(Number(c.receita_total))}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {c.spend != null ? fmtBRL(c.spend) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {c.cpl != null && c.cpl > 0 ? fmtBRL(c.cpl) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.roi != null && c.spend && c.spend > 0 ? (
                          <Badge variant={c.roi > 1 ? "default" : c.roi < 0 ? "destructive" : "secondary"}>
                            {(c.roi * 100).toFixed(0)}%
                          </Badge>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gargalos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Gargalos invisíveis — onde os leads estão parando
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bottlenecks.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem gargalos detectados no período.</div>
          ) : (
            <div className="space-y-3">
              {bottlenecks.map((b) => {
                const pct = b.total_leads > 0 ? (Number(b.leads_parados) / Number(b.total_leads)) * 100 : 0;
                return (
                  <div key={b.etapa_id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{b.etapa_nome}</span>
                      <span className="text-muted-foreground">
                        {fmtNum(b.leads_parados)} parados de {fmtNum(b.total_leads)} ·{" "}
                        <span className="text-amber-500 font-medium">{Number(b.dias_medio_parado).toFixed(0)}d médio</span> ·{" "}
                        potencial {fmtBRL(Number(b.receita_potencial))}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3">
            "Você não precisa de mais tráfego. Você precisa parar de perder os leads que já chegam."
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon, label, value, sub, highlight,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: "good" | "bad" }) {
  const cls = highlight === "good"
    ? "border-emerald-500/30 bg-emerald-500/5"
    : highlight === "bad"
    ? "border-destructive/30 bg-destructive/5"
    : "";
  return (
    <Card className={`border-0 shadow-card ${cls}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function FunnelStrip({ totals }: { totals: { novos: number; em_contato: number; qualificados: number; agendados: number; ganhos: number; perdidos: number } }) {
  const stages = [
    { key: "novos", label: "Novos", value: totals.novos, color: "bg-slate-400" },
    { key: "em_contato", label: "Em contato", value: totals.em_contato, color: "bg-blue-500" },
    { key: "qualificados", label: "Qualificados", value: totals.qualificados, color: "bg-purple-500" },
    { key: "agendados", label: "Agendados", value: totals.agendados, color: "bg-amber-500" },
    { key: "ganhos", label: "Fechados", value: totals.ganhos, color: "bg-emerald-500" },
    { key: "perdidos", label: "Perdidos", value: totals.perdidos, color: "bg-destructive" },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      {stages.map((s) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={s.key} className="space-y-2">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold">{fmtNum(s.value)}</div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${s.color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
