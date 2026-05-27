import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CLINICA_ETAPAS, CLINICA_FUNNEL_NAME } from "@/lib/clinicaFunnelTemplate";

interface Props {
  onFunilCreated: () => void | Promise<void>;
}

export function CriarFunilClinicaButton({ onFunilCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { data: companyId, error: cErr } = await supabase.rpc("get_my_company_id" as any);
      if (cErr || !companyId) throw new Error("Empresa não encontrada");

      // 1. Cria funil via edge function (já valida permissões)
      const funilResp = await supabase.functions.invoke("api-funil-vendas", {
        body: { action: "criar_funil", data: { nome: CLINICA_FUNNEL_NAME } },
      });
      const funilId = funilResp.data?.data?.id;
      if (funilResp.error || !funilId) throw new Error("Erro ao criar funil");

      // 2. Cria etapas e captura IDs
      const etapaIds: Record<string, string> = {};
      for (const et of CLINICA_ETAPAS) {
        const etResp = await supabase.functions.invoke("api-funil-vendas", {
          body: {
            action: "criar_etapa",
            data: { nome: et.nome, funil_id: funilId, posicao: et.posicao, cor: et.cor },
          },
        });
        const eid = etResp.data?.data?.id;
        if (eid) etapaIds[et.nome] = eid;
      }

      // 3. Cria configs de Follow Inteligente por etapa
      const configRows = CLINICA_ETAPAS
        .filter((e) => e.follow && etapaIds[e.nome])
        .map((e) => ({
          etapa_id: etapaIds[e.nome],
          funil_id: funilId,
          company_id: companyId as string,
          ativo: true,
          tempo_valor: e.follow!.tempo_valor,
          tempo_unidade: e.follow!.tempo_unidade,
          canal: e.follow!.canal,
          mensagem_custom: e.follow!.mensagem_custom ?? null,
          tarefa_titulo: e.follow!.tarefa_titulo ?? null,
          criar_tarefa: false,
          notificar_responsavel: !!e.follow!.notificar_responsavel,
          avancar_proxima_etapa: false,
        }));

      if (configRows.length > 0) {
        const { error: cfgErr } = await supabase
          .from("follow_etapa_config" as any)
          .upsert(configRows, { onConflict: "etapa_id" });
        if (cfgErr) console.warn("Falha em algumas automações:", cfgErr.message);
      }

      toast.success("Funil Clínica criado com Follow Inteligente ativo!");
      setOpen(false);
      await onFunilCreated();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar funil clínica");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
          <Stethoscope className="h-4 w-4" />
          Criar Funil Clínica
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Criar Jornada do Paciente?</AlertDialogTitle>
          <AlertDialogDescription>
            Vamos criar um funil completo com 10 etapas: Novo Contato → Contato Realizado → Agendamento → Confirmada →
            Compareceu → Procedimento → Pós-Consulta → Retorno → Não Compareceu → Perdido.
            <br /><br />
            Cada etapa já vem com Follow Inteligente pré-configurado (confirmação, lembrete 30min antes, resgate de no-show,
            pós-consulta, reativação 30/90 dias).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); handleCreate(); }} disabled={loading}>
            {loading ? "Criando..." : "Criar funil pronto"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
