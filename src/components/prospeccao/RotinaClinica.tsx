import { useRotinaClinica, RotinaLead } from "@/hooks/useRotinaClinica";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, PhoneOff, RefreshCw, UserPlus, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

function LeadRow({ lead }: { lead: RotinaLead }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 border border-border/40">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm truncate">{lead.name}</div>
        <div className="text-xs text-muted-foreground truncate">{lead.telefone ?? "Sem telefone"}</div>
      </div>
      <Button size="sm" variant="ghost" onClick={() => navigate(`/conversas?contato=${lead.telefone ?? ""}`)}>
        <MessageCircle className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Bloco({
  titulo, icon: Icon, leads, vazio, cor,
}: { titulo: string; icon: any; leads: RotinaLead[]; vazio: string; cor: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${cor}`} />
            {titulo}
          </span>
          <Badge variant="secondary">{leads.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 max-h-[360px] overflow-y-auto">
        {leads.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">{vazio}</p>
        ) : (
          leads.map((l) => <LeadRow key={l.id} lead={l} />)
        )}
      </CardContent>
    </Card>
  );
}

export function RotinaClinica() {
  const { confirmar, resgatarNoShow, reativar, novos, loading, reload } = useRotinaClinica();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Rotina do Dia — Clínica</h2>
          <p className="text-sm text-muted-foreground">
            Pacientes que precisam de ação agora — gerados automaticamente do seu funil
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Bloco titulo="Confirmar consultas" icon={CalendarCheck} cor="text-blue-500"
          leads={confirmar} vazio="Sem agendamentos para confirmar" />
        <Bloco titulo="Resgatar no-show" icon={PhoneOff} cor="text-orange-500"
          leads={resgatarNoShow} vazio="Sem faltas recentes" />
        <Bloco titulo="Reativar pacientes" icon={RefreshCw} cor="text-purple-500"
          leads={reativar} vazio="Nenhum paciente para reativar" />
        <Bloco titulo="Novos contatos hoje" icon={UserPlus} cor="text-green-500"
          leads={novos} vazio="Sem novos contatos hoje" />
      </div>
    </div>
  );
}
