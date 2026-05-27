import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RotinaLead {
  id: string;
  name: string;
  telefone: string | null;
  etapa_nome: string;
  last_interaction_at: string | null;
  last_movement_at: string | null;
}

export interface RotinaClinicaData {
  confirmar: RotinaLead[];
  resgatarNoShow: RotinaLead[];
  reativar: RotinaLead[];
  novos: RotinaLead[];
  loading: boolean;
  reload: () => void;
}

const ETAPAS_CONFIRMAR = ["Agendamento Feito"];
const ETAPAS_NOSHOW = ["Não Compareceu"];
const ETAPAS_POS = ["Pós-Consulta", "Procedimento Realizado"];

export function useRotinaClinica(): RotinaClinicaData {
  const [data, setData] = useState<Omit<RotinaClinicaData, "loading" | "reload">>({
    confirmar: [], resgatarNoShow: [], reativar: [], novos: [],
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: companyId } = await supabase.rpc("get_my_company_id" as any);
      if (!companyId) { setLoading(false); return; }

      // Busca etapas chave
      const { data: etapas } = await supabase
        .from("etapas")
        .select("id, nome, funil_id")
        .eq("company_id", companyId as string);
      const etapasArr = etapas ?? [];

      const idsBy = (nomes: string[]) =>
        etapasArr.filter((e: any) => nomes.includes(e.nome)).map((e: any) => e.id);

      const idsConfirmar = idsBy(ETAPAS_CONFIRMAR);
      const idsNoShow = idsBy(ETAPAS_NOSHOW);
      const idsPos = idsBy(ETAPAS_POS);

      const baseSelect = "id, name, telefone, phone, etapa_id, last_interaction_at, last_movement_at, created_at";

      const now = Date.now();
      const seteDiasAtras = new Date(now - 7 * 86400000).toISOString();
      const trintaDiasAtras = new Date(now - 30 * 86400000).toISOString();
      const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0);
      const inicioHojeISO = inicioHoje.toISOString();

      const queries: any[] = [];

      queries.push(idsConfirmar.length
        ? supabase.from("leads").select(baseSelect).eq("company_id", companyId).in("etapa_id", idsConfirmar).range(0, 49)
        : Promise.resolve({ data: [] }));

      queries.push(idsNoShow.length
        ? supabase.from("leads").select(baseSelect).eq("company_id", companyId).in("etapa_id", idsNoShow)
            .gte("last_movement_at", seteDiasAtras).range(0, 49)
        : Promise.resolve({ data: [] }));

      queries.push(idsPos.length
        ? supabase.from("leads").select(baseSelect).eq("company_id", companyId).in("etapa_id", idsPos)
            .lte("last_interaction_at", trintaDiasAtras).range(0, 49)
        : Promise.resolve({ data: [] }));

      queries.push(supabase.from("leads").select(baseSelect)
        .eq("company_id", companyId).gte("created_at", inicioHojeISO).range(0, 49));

      const [c, n, r, nv] = await Promise.all(queries);

      const map = (arr: any[]): RotinaLead[] => (arr ?? []).map((l) => ({
        id: l.id, name: l.name,
        telefone: l.telefone || l.phone || null,
        etapa_nome: etapasArr.find((e: any) => e.id === l.etapa_id)?.nome ?? "",
        last_interaction_at: l.last_interaction_at,
        last_movement_at: l.last_movement_at,
      }));

      setData({
        confirmar: map(c.data),
        resgatarNoShow: map(n.data),
        reativar: map(r.data),
        novos: map(nv.data),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...data, loading, reload: load };
}
