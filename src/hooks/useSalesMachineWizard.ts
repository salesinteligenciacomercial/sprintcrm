import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlayerProfile } from "./usePlayerProfile";

export interface DiagnosticoMaquina {
  id?: string;
  company_id?: string;
  // Financeiro atual
  faturamento_atual: number;
  meses_travado: number;
  // Estrutura
  sdrs_atual: number;
  closers_atual: number;
  ferramentas: string[];
  // Métricas atuais
  ticket_medio_atual: number;
  taxa_lead_reuniao_atual: number;
  taxa_show_atual: number;
  taxa_win_atual: number;
  ciclo_dias_atual: number;
  // Atividades
  atividades: Record<string, boolean>;
  // Gargalos
  gargalos_observacoes?: string | null;
  gargalos_auto: string[];
  // Plano
  meta_faturamento: number;
  prazo_meses: number;
  manter_estrutura: boolean;
  plano_acoes: Array<{ titulo: string; responsavel?: string; prazo?: string; status?: string }>;
}

export const DEFAULT_DIAGNOSTICO: DiagnosticoMaquina = {
  faturamento_atual: 0,
  meses_travado: 0,
  sdrs_atual: 0,
  closers_atual: 0,
  ferramentas: [],
  ticket_medio_atual: 0,
  taxa_lead_reuniao_atual: 0,
  taxa_show_atual: 0,
  taxa_win_atual: 0,
  ciclo_dias_atual: 30,
  atividades: {},
  gargalos_observacoes: "",
  gargalos_auto: [],
  meta_faturamento: 0,
  prazo_meses: 6,
  manter_estrutura: true,
  plano_acoes: [],
};

export function useDiagnostico() {
  const { companyId } = usePlayerProfile();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["sm-diagnostico", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_machine_diagnostico" as any)
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as DiagnosticoMaquina | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: DiagnosticoMaquina) => {
      const row: any = { ...payload, company_id: companyId };
      if (row.id) {
        const { error } = await supabase.from("sales_machine_diagnostico" as any).update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sales_machine_diagnostico" as any).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sm-diagnostico", companyId] }),
  });

  return { ...query, upsert };
}

// ============== Daily Log ==============
export interface DailyLog {
  id?: string;
  company_id?: string;
  user_id?: string;
  log_date: string; // YYYY-MM-DD
  role_type: "sdr" | "closer" | "hibrido";
  leads_prospectados: number;
  ligacoes_feitas: number;
  mensagens_enviadas: number;
  followups: number;
  reunioes_agendadas: number;
  reunioes_realizadas: number;
  oportunidades_abertas: number;
  propostas_enviadas: number;
  vendas_fechadas: number;
  faturamento_gerado: number;
  observacoes?: string | null;
}

export const EMPTY_LOG: DailyLog = {
  log_date: new Date().toISOString().slice(0, 10),
  role_type: "closer",
  leads_prospectados: 0,
  ligacoes_feitas: 0,
  mensagens_enviadas: 0,
  followups: 0,
  reunioes_agendadas: 0,
  reunioes_realizadas: 0,
  oportunidades_abertas: 0,
  propostas_enviadas: 0,
  vendas_fechadas: 0,
  faturamento_gerado: 0,
  observacoes: "",
};

export function useTodayLog() {
  const { userId, companyId } = usePlayerProfile();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const query = useQuery({
    queryKey: ["sm-daily-log", userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_machine_daily_log" as any)
        .select("*")
        .eq("user_id", userId!)
        .eq("log_date", today)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as DailyLog | null;
    },
  });

  const save = useMutation({
    mutationFn: async (payload: DailyLog) => {
      const row: any = { ...payload, user_id: userId, company_id: companyId, log_date: today };
      if (row.id) {
        const { error } = await supabase.from("sales_machine_daily_log" as any).update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sales_machine_daily_log" as any).insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sm-daily-log", userId, today] });
      qc.invalidateQueries({ queryKey: ["sm-team-logs"] });
    },
  });

  return { ...query, save };
}

// Logs do time (gestor) — últimos N dias
export function useTeamLogs(days: number = 7) {
  const { companyId } = usePlayerProfile();
  return useQuery({
    queryKey: ["sm-team-logs", companyId, days],
    enabled: !!companyId,
    queryFn: async () => {
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromStr = from.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("sales_machine_daily_log" as any)
        .select("*")
        .eq("company_id", companyId!)
        .gte("log_date", fromStr)
        .order("log_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any as DailyLog[];
    },
  });
}

// Análise automática de gargalos (compara métricas atuais vs benchmarks típicos)
export function detectGargalos(d: DiagnosticoMaquina): string[] {
  const gargalos: string[] = [];
  if (d.taxa_lead_reuniao_atual > 0 && d.taxa_lead_reuniao_atual < 8)
    gargalos.push("Conversão Lead→Reunião abaixo de 8% — qualificação fraca ou ICP errado.");
  if (d.taxa_show_atual > 0 && d.taxa_show_atual < 50)
    gargalos.push("No-show acima de 50% — falta de confirmação/lembretes antes da reunião.");
  if (d.taxa_win_atual > 0 && d.taxa_win_atual < 15)
    gargalos.push("Win rate abaixo de 15% — pitch comercial ou oferta precisam ser revisados.");
  if (d.ciclo_dias_atual > 60)
    gargalos.push("Ciclo de venda muito longo (>60 dias) — falta urgência ou processo de fechamento.");
  if (d.meses_travado >= 6)
    gargalos.push("Faturamento travado há mais de 6 meses — sinal forte de teto operacional.");
  if (d.sdrs_atual === 0 && d.closers_atual > 0)
    gargalos.push("Sem SDRs — closers gastam tempo prospectando ao invés de fechar.");
  if (!d.atividades?.followup) gargalos.push("Time não faz follow-up sistemático — receita perdida.");
  if (!d.atividades?.cold_call) gargalos.push("Sem cold call ativa — dependência só de inbound.");
  return gargalos;
}
