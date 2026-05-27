import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BIClinicoData {
  totalPacientes: number;
  totalAgendados: number;
  totalCompareceram: number;
  totalProcedimentos: number;
  totalRetornos: number;
  totalNoShow: number;
  totalRecuperados: number;
  ticketMedio: number;
  taxaAgendamento: number;
  showRate: number;
  taxaProcedimento: number;
  taxaRetorno: number;
  taxaRecuperacaoNoShow: number;
  loading: boolean;
  reload: () => void;
}

const ETAPAS_AGENDADO_OUMAIS = ["Agendamento Feito", "Consulta Confirmada", "Compareceu", "Procedimento Realizado", "Pós-Consulta", "Retorno / Recorrência"];
const ETAPAS_COMPARECEU_OUMAIS = ["Compareceu", "Procedimento Realizado", "Pós-Consulta", "Retorno / Recorrência"];
const ETAPAS_PROCEDIMENTO_OUMAIS = ["Procedimento Realizado", "Pós-Consulta", "Retorno / Recorrência"];
const ETAPAS_RETORNO = ["Retorno / Recorrência"];
const ETAPAS_NOSHOW = ["Não Compareceu"];

export function useBIClinico(): BIClinicoData {
  const [state, setState] = useState<Omit<BIClinicoData, "loading" | "reload">>({
    totalPacientes: 0, totalAgendados: 0, totalCompareceram: 0, totalProcedimentos: 0,
    totalRetornos: 0, totalNoShow: 0, totalRecuperados: 0, ticketMedio: 0,
    taxaAgendamento: 0, showRate: 0, taxaProcedimento: 0, taxaRetorno: 0, taxaRecuperacaoNoShow: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: companyId } = await supabase.rpc("get_my_company_id" as any);
      if (!companyId) { setLoading(false); return; }

      const { data: etapas } = await supabase
        .from("etapas")
        .select("id, nome")
        .eq("company_id", companyId as string);
      const etapasArr = etapas ?? [];

      const ids = (nomes: string[]) =>
        etapasArr.filter((e: any) => nomes.includes(e.nome)).map((e: any) => e.id);

      const idsAgendado = ids(ETAPAS_AGENDADO_OUMAIS);
      const idsCompareceu = ids(ETAPAS_COMPARECEU_OUMAIS);
      const idsProc = ids(ETAPAS_PROCEDIMENTO_OUMAIS);
      const idsRetorno = ids(ETAPAS_RETORNO);
      const idsNoShow = ids(ETAPAS_NOSHOW);

      const countIn = async (etapaIds: string[]) => {
        if (etapaIds.length === 0) return 0;
        const { count } = await supabase.from("leads").select("id", { count: "exact", head: true })
          .eq("company_id", companyId).in("etapa_id", etapaIds);
        return count ?? 0;
      };

      const totalPacientes = await (async () => {
        const { count } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("company_id", companyId);
        return count ?? 0;
      })();

      const [totalAgendados, totalCompareceram, totalProcedimentos, totalRetornos, totalNoShow] = await Promise.all([
        countIn(idsAgendado), countIn(idsCompareceu), countIn(idsProc), countIn(idsRetorno), countIn(idsNoShow),
      ]);

      // Ticket médio: leads em procedimento ou+
      let ticketMedio = 0;
      if (idsProc.length > 0) {
        const { data: valores } = await supabase.from("leads")
          .select("value").eq("company_id", companyId).in("etapa_id", idsProc).gt("value", 0).range(0, 999);
        const arr = (valores ?? []).map((v: any) => Number(v.value) || 0);
        if (arr.length) ticketMedio = arr.reduce((a, b) => a + b, 0) / arr.length;
      }

      // Recuperação de no-show: leads que estavam em no-show e voltaram pra etapa agendado/compareceu via histórico
      // Aproximação leve: se tabela lead_value_history não tiver isso, deixamos 0 e usamos só no-show count
      let totalRecuperados = 0;
      try {
        if (idsNoShow.length && idsAgendado.length) {
          const { data: hist } = await supabase
            .from("lead_value_history" as any)
            .select("lead_id, old_etapa_id, new_etapa_id")
            .in("old_etapa_id", idsNoShow)
            .in("new_etapa_id", idsAgendado)
            .range(0, 999);
          const uniq = new Set((hist ?? []).map((h: any) => h.lead_id));
          totalRecuperados = uniq.size;
        }
      } catch { /* tabela pode não existir */ }

      const pct = (num: number, den: number) => den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

      setState({
        totalPacientes, totalAgendados, totalCompareceram, totalProcedimentos,
        totalRetornos, totalNoShow, totalRecuperados,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        taxaAgendamento: pct(totalAgendados, totalPacientes),
        showRate: pct(totalCompareceram, totalAgendados),
        taxaProcedimento: pct(totalProcedimentos, totalCompareceram),
        taxaRetorno: pct(totalRetornos, totalProcedimentos),
        taxaRecuperacaoNoShow: pct(totalRecuperados, totalNoShow + totalRecuperados),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...state, loading, reload: load };
}
