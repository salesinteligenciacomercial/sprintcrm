import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Target, User as UserIcon } from "lucide-react";

type Metric =
  | "gross_value"
  | "sales_closed"
  | "calls"
  | "meetings_scheduled"
  | "leads_prospected";

type Period = "daily" | "weekly" | "monthly";
type GoalKey = `${Period}:${Metric}`;

interface GoalRow {
  id: string;
  user_id: string | null;
  metric: Metric;
  period: Period;
  target_value: number;
  active: boolean | null;
}

const PERIODS: { key: Period; label: string; helper: string }[] = [
  { key: "daily", label: "Diária", helper: "Meta para hoje" },
  { key: "weekly", label: "Semanal", helper: "Meta da semana" },
  { key: "monthly", label: "Mensal", helper: "Meta do mês" },
];

const METRICS: { key: Metric; label: string; isCurrency?: boolean; icon: string }[] = [
  { key: "gross_value", label: "Faturamento (R$)", isCurrency: true, icon: "💰" },
  { key: "sales_closed", label: "Vendas fechadas", icon: "🏆" },
  { key: "calls", label: "Ligações", icon: "📞" },
  { key: "meetings_scheduled", label: "Reuniões agendadas", icon: "📅" },
  { key: "leads_prospected", label: "Leads prospectados", icon: "🎯" },
];

const goalKey = (period: Period, metric: Metric): GoalKey => `${period}:${metric}`;

const emptyValues = (): Record<GoalKey, string> => {
  const initial = {} as Record<GoalKey, string>;
  PERIODS.forEach((period) => {
    METRICS.forEach((metric) => {
      initial[goalKey(period.key, metric.key)] = "";
    });
  });
  return initial;
};

export default function IndividualGoalsManager() {
  const { members, loading: loadingMembers } = useTeamMembers();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [values, setValues] = useState<Record<GoalKey, string>>(emptyValues);
  const [existing, setExisting] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_my_company_id");
      if (data) setCompanyId(data as string);
    })();
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setExisting([]);
      setValues(emptyValues());
      return;
    }
    loadGoals(selectedUser);
  }, [selectedUser]);

  const loadGoals = async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("commercial_goals")
      .select("id, user_id, metric, period, target_value, active")
      .eq("user_id", uid)
      .eq("scope", "user")
      .eq("active", true);
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar metas");
      return;
    }
    const rows = (data || []) as GoalRow[];
    setExisting(rows);
    const next = emptyValues();
    rows.forEach((r) => {
      if (PERIODS.some((p) => p.key === r.period) && METRICS.some((m) => m.key === r.metric)) {
        next[goalKey(r.period, r.metric)] = String(r.target_value ?? "");
      }
    });
    setValues(next);
  };

  const handleSave = async () => {
    if (!selectedUser || !companyId) {
      toast.error("Selecione um colaborador");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const created_by = user?.id ?? null;
      const rowsToInsert = PERIODS.flatMap((period) =>
        METRICS.map((metric) => {
          const raw = values[goalKey(period.key, metric.key)]?.trim();
          const target_value = raw ? Number(raw) : 0;
          return { period, metric, raw, target_value };
        })
      ).filter(({ raw, target_value }) => raw && target_value > 0);

      const hasInvalidValue = PERIODS.some((period) =>
        METRICS.some((metric) => {
          const raw = values[goalKey(period.key, metric.key)]?.trim();
          return !!raw && (Number.isNaN(Number(raw)) || Number(raw) < 0);
        })
      );

      if (hasInvalidValue) {
        toast.error("Informe apenas valores válidos nas metas");
        return;
      }

      const { error: deleteError } = await supabase
        .from("commercial_goals")
        .delete()
        .eq("company_id", companyId)
        .eq("user_id", selectedUser)
        .eq("scope", "user");
      if (deleteError) throw deleteError;

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase.from("commercial_goals").insert(
          rowsToInsert.map(({ period, metric, target_value }) => ({
            company_id: companyId,
            user_id: selectedUser,
            scope: "user",
            metric: metric.key,
            period: period.key,
            target_value,
            start_date: new Date().toISOString().slice(0, 10),
            active: true,
            created_by,
          }))
        );
        if (insertError) throw insertError;
      }

      toast.success("Metas individuais salvas");
      await loadGoals(selectedUser);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!selectedUser || !companyId) return;
    if (!confirm("Remover todas as metas individuais deste colaborador?")) return;
    const { error } = await supabase
      .from("commercial_goals")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", selectedUser)
      .eq("scope", "user");
    if (error) toast.error("Erro ao remover");
    else {
      toast.success("Metas removidas");
      await loadGoals(selectedUser);
    }
  };

  const selectedMember = useMemo(() => members.find((m) => m.id === selectedUser), [members, selectedUser]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Target className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Metas Individuais por Colaborador</h2>
            <p className="text-sm text-slate-500">Defina metas diárias, semanais e mensais. O colaborador verá tudo na Rotina com progresso.</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Colaborador</label>
          {loadingMembers ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando equipe…</div>
          ) : (
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full md:w-96 border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Selecione um colaborador…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email} {m.role ? `· ${m.role}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedMember && (
          <>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                {(selectedMember.full_name || selectedMember.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900">{selectedMember.full_name || selectedMember.email}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1"><UserIcon className="w-3 h-3" /> {selectedMember.email}</div>
              </div>
            </div>

            <div className="space-y-5">
              {PERIODS.map((period) => (
                <div key={period.key} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Meta {period.label}</h3>
                      <p className="text-xs text-slate-500">{period.helper}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      {period.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {METRICS.map((m) => {
                      const key = goalKey(period.key, m.key);
                      return (
                        <div key={key} className="border border-slate-200 rounded-xl p-4 bg-white">
                          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                            {m.icon} {m.label}
                          </label>
                          <div className="flex items-center gap-2">
                            {m.isCurrency && <span className="text-slate-500 text-sm">R$</span>}
                            <input
                              type="number"
                              min="0"
                              step={m.isCurrency ? "100" : "1"}
                              value={values[key]}
                              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                              placeholder="0"
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1.5">Meta {period.label.toLowerCase()}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {loading && <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando metas atuais…</div>}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={handleClearAll}
                disabled={saving || existing.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" /> Remover todas
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar metas
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
