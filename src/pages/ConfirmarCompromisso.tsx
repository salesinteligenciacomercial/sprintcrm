import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, CalendarClock, User, Stethoscope, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CompromissoData {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string | null;
  tipo_servico: string | null;
  titulo: string | null;
  observacoes: string | null;
  status_confirmacao: string;
  paciente: string;
  profissional_nome: string;
  empresa_nome: string;
}

export default function ConfirmarCompromisso() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [data, setData] = useState<CompromissoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<"confirmado" | "recusado" | null>(null);

  useEffect(() => {
    document.title = "Confirmar Agendamento";
    if (!token) {
      setError("Link inválido.");
      setLoading(false);
      return;
    }
    (async () => {
      const { data: rows, error: rpcError } = await supabase.rpc("get_compromisso_by_token", {
        _token: token,
      });
      if (rpcError) {
        setError("Não foi possível carregar o agendamento.");
      } else if (!rows || (rows as any[]).length === 0) {
        setError("Agendamento não encontrado ou link expirado.");
      } else {
        const row = (rows as any[])[0] as CompromissoData;
        setData(row);
        if (row.status_confirmacao === "confirmado") setResultado("confirmado");
        if (row.status_confirmacao === "recusado") setResultado("recusado");
      }
      setLoading(false);
    })();
  }, [token]);

  const handleAcao = async (acao: "confirmar" | "recusar") => {
    if (!token) return;
    setActing(true);
    const { data: resp, error: rpcError } = await supabase.rpc(
      "confirmar_compromisso_by_token",
      { _token: token, _acao: acao }
    );
    setActing(false);
    if (rpcError || !(resp as any)?.success) {
      toast.error("Erro ao registrar resposta. Tente novamente.");
      return;
    }
    setResultado(acao === "confirmar" ? "confirmado" : "recusado");
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-3">
            <CalendarClock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {data?.empresa_nome || "Confirmação de Agendamento"}
          </h1>
          {!resultado && (
            <p className="text-muted-foreground mt-1">Confirme seu agendamento abaixo</p>
          )}
        </div>

        <Card className="border-2">
          <CardContent className="p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && error && (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                <p className="text-foreground font-medium">{error}</p>
              </div>
            )}

            {!loading && data && !error && (
              <>
                {resultado === "confirmado" && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      Seu agendamento foi confirmado!
                    </h2>
                    <p className="text-muted-foreground">Essa janela já pode ser fechada.</p>
                  </div>
                )}

                {resultado === "recusado" && (
                  <div className="text-center py-8">
                    <XCircle className="h-16 w-16 text-destructive mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      Recebemos sua resposta
                    </h2>
                    <p className="text-muted-foreground">
                      Entraremos em contato para reagendar. Obrigado!
                    </p>
                  </div>
                )}

                {!resultado && (
                  <>
                    <div className="space-y-3">
                      {data.paciente && (
                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Paciente / Cliente</p>
                            <p className="font-semibold text-foreground">{data.paciente}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <CalendarClock className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Data e horário</p>
                          <p className="font-semibold text-foreground">
                            {formatDateTime(data.data_hora_inicio)}
                          </p>
                        </div>
                      </div>
                      {data.profissional_nome && (
                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Profissional</p>
                            <p className="font-semibold text-foreground">
                              {data.profissional_nome}
                            </p>
                          </div>
                        </div>
                      )}
                      {(data.tipo_servico || data.titulo) && (
                        <div className="flex items-start gap-3">
                          <Stethoscope className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Procedimento / Serviço</p>
                            <p className="font-semibold text-foreground">
                              {data.titulo || data.tipo_servico}
                            </p>
                          </div>
                        </div>
                      )}
                      {data.observacoes && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1">Observações</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {data.observacoes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <Button
                        size="lg"
                        onClick={() => handleAcao("confirmar")}
                        disabled={acting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {acting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Confirmar
                          </>
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => handleAcao("recusar")}
                        disabled={acting}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Não confirmar
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
