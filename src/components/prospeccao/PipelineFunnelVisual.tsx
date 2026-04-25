import { Users, MessageCircle, Target, Calendar, DollarSign, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ProspeccaoLog } from "@/hooks/useProspeccaoData";

interface Props {
  data: ProspeccaoLog[];
  isLoading?: boolean;
  activeStage?: string | null;
  onStageClick?: (stage: string | null) => void;
}

/**
 * Funil horizontal interativo com taxas de conversão entre etapas.
 * Substitui a grade plana de KPIs por um pipeline visual ramificado.
 */
export function PipelineFunnelVisual({ data, isLoading, activeStage, onStageClick }: Props) {
  const totals = data.reduce(
    (acc, r) => ({
      leads: acc.leads + r.leads_prospected,
      responses: acc.responses + r.responses,
      opportunities: acc.opportunities + r.opportunities,
      meetings: acc.meetings + r.meetings_scheduled,
      sales: acc.sales + r.sales_closed,
      gross: acc.gross + Number(r.gross_value),
    }),
    { leads: 0, responses: 0, opportunities: 0, meetings: 0, sales: 0, gross: 0 }
  );

  const pct = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1) : "0");

  const stages = [
    {
      key: "leads",
      label: "Leads",
      value: totals.leads,
      icon: Users,
      gradient: "from-blue-500/20 to-blue-500/5",
      ring: "ring-blue-500/40",
      iconColor: "text-blue-500",
    },
    {
      key: "responses",
      label: "Respostas",
      value: totals.responses,
      icon: MessageCircle,
      gradient: "from-cyan-500/20 to-cyan-500/5",
      ring: "ring-cyan-500/40",
      iconColor: "text-cyan-500",
    },
    {
      key: "opportunities",
      label: "Oportunidades",
      value: totals.opportunities,
      icon: Target,
      gradient: "from-emerald-500/20 to-emerald-500/5",
      ring: "ring-emerald-500/40",
      iconColor: "text-emerald-500",
    },
    {
      key: "meetings",
      label: "Reuniões",
      value: totals.meetings,
      icon: Calendar,
      gradient: "from-purple-500/20 to-purple-500/5",
      ring: "ring-purple-500/40",
      iconColor: "text-purple-500",
    },
    {
      key: "sales",
      label: "Vendas",
      value: totals.sales,
      icon: DollarSign,
      gradient: "from-green-500/20 to-green-500/5",
      ring: "ring-green-500/40",
      iconColor: "text-green-500",
    },
  ];

  const conversions = [
    pct(totals.responses, totals.leads),
    pct(totals.opportunities, totals.responses),
    pct(totals.meetings, totals.opportunities),
    pct(totals.sales, totals.meetings),
  ];

  return (
    <Card className="p-4 md:p-5 bg-gradient-to-br from-card to-card/50 border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Pipeline de Conversão</h3>
          <p className="text-xs text-muted-foreground">
            Clique numa etapa para destacar • Valor bruto:{" "}
            <span className="font-semibold text-foreground">
              R$ {totals.gross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        {activeStage && (
          <button
            onClick={() => onStageClick?.(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            Limpar filtro
          </button>
        )}
      </div>

      <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.key;
          const conversion = idx > 0 ? conversions[idx - 1] : null;

          return (
            <div key={stage.key} className="flex items-stretch gap-2 flex-shrink-0">
              <button
                onClick={() => onStageClick?.(isActive ? null : stage.key)}
                className={cn(
                  "relative flex flex-col items-center justify-center min-w-[120px] md:min-w-[140px] p-3 rounded-xl",
                  "bg-gradient-to-br border border-border transition-all duration-300",
                  "hover:scale-[1.03] hover:shadow-lg cursor-pointer",
                  stage.gradient,
                  isActive && `ring-2 ${stage.ring} scale-[1.03] shadow-lg`
                )}
              >
                <div className={cn("p-2 rounded-lg bg-background/60 mb-2", stage.iconColor)}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {isLoading ? "—" : stage.value.toLocaleString("pt-BR")}
                </p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">
                  {stage.label}
                </p>
              </button>

              {idx < stages.length - 1 && (
                <div className="flex flex-col items-center justify-center px-1 min-w-[56px]">
                  <div className="flex items-center text-muted-foreground/60">
                    <div className="h-px w-3 bg-border" />
                    <ChevronRight className="h-4 w-4" />
                  </div>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                      {conversion}%
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-0.5">conversão</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
