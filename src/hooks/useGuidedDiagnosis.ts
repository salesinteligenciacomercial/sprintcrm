import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GuidedPilar = "aquisicao" | "social" | "dependencia" | "crescimento";

export interface GuidedResponse {
  id: string;
  company_id: string;
  pilar: GuidedPilar;
  responses: Record<string, any>;
  score: number;
  completed_at: string | null;
  updated_at: string;
}

export function useGuidedDiagnosis() {
  return useQuery({
    queryKey: ["wmi_guided_responses"],
    queryFn: async (): Promise<Record<GuidedPilar, GuidedResponse | null>> => {
      const { data, error } = await supabase
        .from("wmi_guided_responses" as any)
        .select("*");
      if (error) throw error;
      const map: Record<GuidedPilar, GuidedResponse | null> = {
        aquisicao: null,
        social: null,
        dependencia: null,
        crescimento: null,
      };
      for (const row of (data as any[]) || []) {
        map[row.pilar as GuidedPilar] = row as GuidedResponse;
      }
      return map;
    },
    staleTime: 30_000,
  });
}

export function useSaveGuidedPilar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      pilar: GuidedPilar;
      responses: Record<string, any>;
      score: number;
    }) => {
      const { data: companyId } = await supabase.rpc("get_my_company_id");
      const payload = {
        company_id: companyId,
        pilar: input.pilar,
        responses: input.responses,
        score: input.score,
        completed_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("wmi_guided_responses" as any)
        .upsert(payload, { onConflict: "company_id,pilar" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wmi_guided_responses"] });
      qc.invalidateQueries({ queryKey: ["wmi_score"] });
    },
  });
}
