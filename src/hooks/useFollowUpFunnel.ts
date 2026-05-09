import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FollowUpStage {
  id: string;
  funnel_id: string;
  company_id: string;
  name: string;
  color: string;
  order_index: number;
  is_terminal: boolean;
  terminal_status: "completed" | "lost" | null;
}

export interface FollowUpFunnel {
  id: string;
  company_id: string;
  name: string;
  is_default: boolean;
}

export function useFollowUpFunnel() {
  const qc = useQueryClient();

  const funnelQuery = useQuery({
    queryKey: ["follow-up-funnel"],
    queryFn: async (): Promise<FollowUpFunnel | null> => {
      const { data: companyId } = await supabase.rpc("get_my_company_id" as any);
      if (!companyId) return null;

      // garante funil default
      await supabase.rpc("ensure_default_follow_up_funnel" as any, { p_company_id: companyId });

      const { data, error } = await (supabase as any)
        .from("follow_up_funnels")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_default", true)
        .maybeSingle();
      if (error) throw error;
      return data as FollowUpFunnel | null;
    },
  });

  const stagesQuery = useQuery({
    queryKey: ["follow-up-stages", funnelQuery.data?.id],
    enabled: !!funnelQuery.data?.id,
    queryFn: async (): Promise<FollowUpStage[]> => {
      const { data, error } = await (supabase as any)
        .from("follow_up_stages")
        .select("*")
        .eq("funnel_id", funnelQuery.data!.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as FollowUpStage[];
    },
  });

  const moveEntry = useMutation({
    mutationFn: async ({ entryId, stageId }: { entryId: string; stageId: string }) => {
      const { error } = await supabase.rpc("move_follow_up_to_stage" as any, {
        p_entry_id: entryId,
        p_stage_id: stageId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow-up-entries"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao mover"),
  });

  const addStage = useMutation({
    mutationFn: async (payload: { name: string; color?: string; is_terminal?: boolean; terminal_status?: "completed" | "lost" | null }) => {
      if (!funnelQuery.data) throw new Error("Funil não encontrado");
      const stages = stagesQuery.data || [];
      const order = stages.length;
      const { error } = await (supabase as any).from("follow_up_stages").insert({
        funnel_id: funnelQuery.data.id,
        company_id: funnelQuery.data.company_id,
        name: payload.name,
        color: payload.color || "#22C55E",
        order_index: order,
        is_terminal: payload.is_terminal ?? false,
        terminal_status: payload.terminal_status ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow-up-stages"] });
      toast.success("Etapa adicionada");
    },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FollowUpStage> & { id: string }) => {
      const { error } = await (supabase as any).from("follow_up_stages").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow-up-stages"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("follow_up_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow-up-stages"] });
      qc.invalidateQueries({ queryKey: ["follow-up-entries"] });
      toast.success("Etapa removida");
    },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  return {
    funnel: funnelQuery.data,
    stages: stagesQuery.data || [],
    isLoading: funnelQuery.isLoading || stagesQuery.isLoading,
    moveEntry,
    addStage,
    updateStage,
    deleteStage,
  };
}
