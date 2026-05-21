import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TagsManagerHook {
  allTags: string[];
  loading: boolean;
  refreshTags: () => Promise<void>;
  addTagToLead: (leadId: string, tag: string) => Promise<void>;
  removeTagFromLead: (leadId: string, tag: string) => Promise<void>;
  getLeadTags: (leadId: string) => Promise<string[]>;
  addStandaloneTag: (tag: string) => Promise<void>;
  removeStandaloneTag: (tag: string) => Promise<void>;
}

let globalTags: string[] = [];
let listeners: Set<() => void> = new Set();
let refreshPromise: Promise<string[]> | null = null;
let lastRefreshAt = 0;
const TAG_REFRESH_TTL_MS = 30_000;

export function useTagsManager(): TagsManagerHook {
  const [allTags, setAllTags] = useState<string[]>(globalTags);
  const [loading, setLoading] = useState(false);

  const notifyListeners = useCallback(() => {
    listeners.forEach(listener => listener());
  }, []);

  const refreshTags = useCallback(async () => {
    setLoading(true);
    try {
      const now = Date.now();
      if (globalTags.length > 0 && now - lastRefreshAt < TAG_REFRESH_TTL_MS) {
        setAllTags([...globalTags]);
        return;
      }

      if (refreshPromise) {
        const cached = await refreshPromise;
        setAllTags([...cached]);
        return;
      }

      refreshPromise = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return globalTags;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!userRole?.company_id) return globalTags;

      // Load tags from leads
      const { data: leadsData } = await supabase
        .from("leads")
        .select("tags")
        .eq("company_id", userRole.company_id)
        .not("tags", "is", null);

      const tagsSet = new Set<string>();
      leadsData?.forEach(lead => {
        lead.tags?.forEach((tag: string) => tagsSet.add(tag));
      });

      // Load standalone tags from company_tags table (persistent)
      const { data: companyTags } = await supabase
        .from("company_tags")
        .select("tag_name")
        .eq("company_id", userRole.company_id);

      companyTags?.forEach(row => tagsSet.add(row.tag_name));

      const sortedTags = Array.from(tagsSet).sort();
      globalTags = sortedTags;
      lastRefreshAt = Date.now();
      return sortedTags;
      })();

      const sortedTags = await refreshPromise;
      setAllTags(sortedTags);
      notifyListeners();
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.message?.includes('Lock broken')) {
        console.debug("Tags: auth lock contention, will retry on next cycle");
        return;
      }
      console.error("Erro ao carregar tags:", error);
    } finally {
      refreshPromise = null;
      setLoading(false);
    }
  }, [notifyListeners]);

  const addStandaloneTag = useCallback(async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const companyId = userRole?.company_id;
      if (!companyId) return;

      // Insert into company_tags table (upsert to avoid duplicates)
      const { error } = await supabase
        .from("company_tags")
        .upsert(
          { company_id: companyId, tag_name: trimmed, created_by: session.user.id },
          { onConflict: "company_id,tag_name" }
        );

      if (error) throw error;

      lastRefreshAt = 0;
      await refreshTags();
    } catch (error) {
      console.error("Erro ao criar tag independente:", error);
      throw error;
    }
  }, [refreshTags]);

  const removeStandaloneTag = useCallback(async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const companyId = userRole?.company_id;
      if (!companyId) return;

      // Delete from company_tags table
      const { error } = await supabase
        .from("company_tags")
        .delete()
        .eq("company_id", companyId)
        .eq("tag_name", trimmed);

      if (error) throw error;

      lastRefreshAt = 0;
      await refreshTags();
    } catch (error) {
      console.error("Erro ao remover tag independente:", error);
      throw error;
    }
  }, [refreshTags]);

  const addTagToLead = useCallback(async (leadId: string, tag: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: lead } = await supabase
        .from("leads")
        .select("tags, company_id")
        .eq("id", leadId)
        .single();

      if (!lead) return;

      const currentTags = lead.tags || [];
      if (currentTags.includes(tag)) return;

      const newTags = [...currentTags, tag];

      await supabase
        .from("leads")
        .update({ 
          tags: newTags,
          company_id: lead.company_id
        })
        .eq("id", leadId);

      // Also ensure tag exists in company_tags for persistence
      if (lead.company_id) {
        await supabase
          .from("company_tags")
          .upsert(
            { company_id: lead.company_id, tag_name: tag, created_by: session?.user?.id || null },
            { onConflict: "company_id,tag_name" }
          );

        await supabase
          .from("lead_tag_history")
          .insert({
            lead_id: leadId,
            company_id: lead.company_id,
            tag_name: tag,
            action: "added",
            created_by: session?.user?.id || null
          });
      }

      lastRefreshAt = 0;
      await refreshTags();
    } catch (error) {
      console.error("Erro ao adicionar tag:", error);
      throw error;
    }
  }, [refreshTags]);

  const removeTagFromLead = useCallback(async (leadId: string, tag: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: lead } = await supabase
        .from("leads")
        .select("tags, company_id")
        .eq("id", leadId)
        .single();

      if (!lead) return;

      const currentTags = lead.tags || [];
      const newTags = currentTags.filter((t: string) => t !== tag);

      await supabase
        .from("leads")
        .update({ 
          tags: newTags.length > 0 ? newTags : null,
          company_id: lead.company_id
        })
        .eq("id", leadId);

      if (lead.company_id) {
        await supabase
          .from("lead_tag_history")
          .insert({
            lead_id: leadId,
            company_id: lead.company_id,
            tag_name: tag,
            action: "removed",
            created_by: session?.user?.id || null
          });
      }

      lastRefreshAt = 0;
      await refreshTags();
    } catch (error) {
      console.error("Erro ao remover tag:", error);
      throw error;
    }
  }, [refreshTags]);

  const getLeadTags = useCallback(async (leadId: string): Promise<string[]> => {
    try {
      const { data: lead } = await supabase
        .from("leads")
        .select("tags")
        .eq("id", leadId)
        .single();

      return lead?.tags || [];
    } catch (error) {
      console.error("Erro ao buscar tags do lead:", error);
      return [];
    }
  }, []);

  useEffect(() => {
    refreshTags();

    const updateLocalTags = () => {
      setAllTags([...globalTags]);
    };

    listeners.add(updateLocalTags);

    return () => {
      listeners.delete(updateLocalTags);
    };
  }, [refreshTags]);

  return {
    allTags,
    loading,
    refreshTags,
    addTagToLead,
    removeTagFromLead,
    getLeadTags,
    addStandaloneTag,
    removeStandaloneTag
  };
}
