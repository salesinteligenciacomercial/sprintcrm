/**
 * useClinicaSeeds
 *
 * Hook idempotente que semeia automações/templates clínicos para empresas
 * cujo `segmento` é uma das clínicas (medicina/odonto/estética).
 *
 * IMPORTANTE: roda APENAS quando `isClinica === true`. Empresas comerciais
 * (agência, financeiro, jurídico, etc.) não são tocadas.
 *
 * Operações são idempotentes — sempre verificam existência antes de inserir.
 * É seguro montar este hook em qualquer layout: o efeito gate-keepa por
 * empresa via flag persistida em localStorage ("clinica-seeds:<companyId>").
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySegmento } from "./useCompanySegmento";

// Cadência padrão Pós-consulta para clínicas
const CADENCIA_POS_CONSULTA = [
  { step_number: 1, days_offset: 0, label: "D0 — Acompanhamento" },
  { step_number: 2, days_offset: 1, label: "D1 — Tirar dúvidas" },
  { step_number: 3, days_offset: 7, label: "D7 — Retorno" },
];

// Categoria de scripts clínicos
const CATEGORIA_SCRIPTS = "Scripts Clínicos";
const CATEGORIA_REATIVACAO = "Reativação Clínica";

const SCRIPTS_CLINICOS = [
  {
    title: "Abertura — Boas-vindas",
    content:
      "Olá {{nome}}! Tudo bem? Sou da {{empresa}}. Vi que você demonstrou interesse em nossos atendimentos. Posso te ajudar a entender o que melhor se encaixa para o seu caso?",
  },
  {
    title: "Qualificação — Entendimento",
    content:
      "{{nome}}, para te orientar da melhor forma: o atendimento é para você ou para outra pessoa? E qual a sua principal queixa/objetivo no momento?",
  },
  {
    title: "Fechamento — Agendamento",
    content:
      "Perfeito, {{nome}}! Tenho os seguintes horários disponíveis esta semana. Qual fica melhor para você comparecer à clínica?",
  },
];

const SCRIPTS_REATIVACAO = [
  {
    title: "Reativação — 30 dias sem contato",
    content:
      "Oi {{nome}}, tudo bem? Faz um tempinho que não falamos. Como você está? Se quiser, posso te enviar nossas novidades e horários disponíveis. 🩺",
  },
  {
    title: "Reativação — Retorno periódico",
    content:
      "{{nome}}, passando para lembrar que já está na hora do seu retorno/avaliação. Posso reservar um horário para você esta semana?",
  },
];

export function useClinicaSeeds() {
  const { isClinica, companyId, loading } = useCompanySegmento();
  const ranRef = useRef(false);

  useEffect(() => {
    if (loading || !isClinica || !companyId) return;
    if (ranRef.current) return;

    const flagKey = `clinica-seeds:${companyId}`;
    if (typeof window !== "undefined" && localStorage.getItem(flagKey) === "1") {
      ranRef.current = true;
      return;
    }

    ranRef.current = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        // 1. Cadência pós-consulta (apenas se nenhuma cadência existir)
        const { data: existingCadence } = await supabase
          .from("follow_up_cadence")
          .select("id")
          .eq("company_id", companyId)
          .limit(1);

        if (!existingCadence || existingCadence.length === 0) {
          await supabase.from("follow_up_cadence").insert(
            CADENCIA_POS_CONSULTA.map((c) => ({ ...c, company_id: companyId }))
          );
        }

        // 2. Categoria + scripts clínicos
        const ensureCategoria = async (nome: string) => {
          const { data: cat } = await supabase
            .from("quick_message_categories")
            .select("id")
            .eq("company_id", companyId)
            .eq("name", nome)
            .maybeSingle();
          if (cat?.id) return cat.id;
          const { data: created } = await supabase
            .from("quick_message_categories")
            .insert({ company_id: companyId, owner_id: userId, name: nome })
            .select("id")
            .single();
          return created?.id ?? null;
        };

        const ensureMessages = async (
          categoryId: string | null,
          items: { title: string; content: string }[]
        ) => {
          if (!categoryId) return;
          const { data: existing } = await supabase
            .from("quick_messages")
            .select("title")
            .eq("company_id", companyId)
            .eq("category_id", categoryId);
          const titles = new Set((existing ?? []).map((m: any) => m.title));
          const toInsert = items
            .filter((it) => !titles.has(it.title))
            .map((it) => ({
              company_id: companyId,
              owner_id: userId,
              category_id: categoryId,
              title: it.title,
              content: it.content,
              message_type: "text" as const,
            }));
          if (toInsert.length > 0) {
            await supabase.from("quick_messages").insert(toInsert);
          }
        };

        const scriptsCatId = await ensureCategoria(CATEGORIA_SCRIPTS);
        await ensureMessages(scriptsCatId, SCRIPTS_CLINICOS);

        const reativacaoCatId = await ensureCategoria(CATEGORIA_REATIVACAO);
        await ensureMessages(reativacaoCatId, SCRIPTS_REATIVACAO);

        if (typeof window !== "undefined") {
          localStorage.setItem(flagKey, "1");
        }
      } catch (err) {
        // Falha silenciosa — usuário não bloqueia, e tentativa volta no próximo load.
        console.warn("[useClinicaSeeds] seed falhou:", err);
        ranRef.current = false;
      }
    })();
  }, [isClinica, companyId, loading]);
}
