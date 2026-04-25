import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, MessageCircle, Target, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProspeccaoLog } from "@/hooks/useProspeccaoData";

interface Props {
  data: ProspeccaoLog[];
}

/**
 * Visualização Kanban dos registros diários.
 * Cada registro aparece em uma coluna baseada na etapa de maior progresso.
 */
export function ProspeccaoKanbanView({ data }: Props) {
  const columns = [
    {
      key: "leads",
      label: "Apenas Leads",
      icon: Users,
      color: "border-t-blue-500",
      bg: "bg-blue-500/5",
      filter: (r: ProspeccaoLog) =>
        r.leads_prospected > 0 && r.responses === 0,
    },
    {
      key: "responses",
      label: "Com Resposta",
      icon: MessageCircle,
      color: "border-t-cyan-500",
      bg: "bg-cyan-500/5",
      filter: (r: ProspeccaoLog) =>
        r.responses > 0 && r.opportunities === 0,
    },
    {
      key: "opportunities",
      label: "Oportunidades",
      icon: Target,
      color: "border-t-emerald-500",
      bg: "bg-emerald-500/5",
      filter: (r: ProspeccaoLog) =>
        r.opportunities > 0 && r.meetings_scheduled === 0,
    },
    {
      key: "meetings",
      label: "Em Reunião",
      icon: Calendar,
      color: "border-t-purple-500",
      bg: "bg-purple-500/5",
      filter: (r: ProspeccaoLog) =>
        r.meetings_scheduled > 0 && r.sales_closed === 0,
    },
    {
      key: "sales",
      label: "Convertido",
      icon: DollarSign,
      color: "border-t-green-500",
      bg: "bg-green-500/5",
      filter: (r: ProspeccaoLog) => r.sales_closed > 0,
    },
  ];

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-3 min-w-max">
        {columns.map((col) => {
          const items = data.filter(col.filter);
          const Icon = col.icon;

          return (
            <div key={col.key} className="w-[260px] flex-shrink-0">
              <Card className={cn("border-t-4 p-3", col.color, col.bg)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      {col.label}
                    </h4>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {items.length}
                  </Badge>
                </div>

                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {items.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground/60 italic">
                      Sem registros
                    </div>
                  ) : (
                    items.map((r) => (
                      <Card
                        key={r.id}
                        className="p-2.5 bg-card/80 hover:bg-card hover:shadow-md transition cursor-pointer border-border"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-foreground truncate">
                            {r.user_name || "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(r.log_date + "T12:00:00").toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground capitalize mb-2 truncate">
                          {(r.source || "—").replace(/_/g, " ")}
                        </p>
                        <div className="grid grid-cols-5 gap-1 text-center">
                          <Stat label="L" value={r.leads_prospected} />
                          <Stat label="R" value={r.responses} />
                          <Stat label="O" value={r.opportunities} />
                          <Stat label="Re" value={r.meetings_scheduled} />
                          <Stat label="V" value={r.sales_closed} highlight />
                        </div>
                        {Number(r.gross_value) > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50 text-right">
                            <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                              R$ {Number(r.gross_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "text-[11px] font-bold tabular-nums",
          highlight ? "text-green-600 dark:text-green-400" : "text-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-[8px] text-muted-foreground uppercase">{label}</span>
    </div>
  );
}
