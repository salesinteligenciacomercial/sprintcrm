// Follow Inteligente Engine — roda via cron a cada 5 min e executa follow-ups configurados
// Regras de segurança:
//  - 1 disparo único por lead/etapa após cada movimento (dedupe global, não por config)
//  - Cooldown de 24h por lead entre qualquer disparo automático
//  - Pula se contato respondeu após o último disparo (sem interação = condição)
//  - Pula se Coach IA está ativa para a conversa (alinhamento com módulo BatePapo)
//  - Pula se há atendimento humano em andamento (active_attendances)
//  - Insere registro de execução ANTES do envio para evitar corrida entre execuções do cron
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_HORAS = 24; // intervalo mínimo entre 2 disparos automáticos para o mesmo lead

interface FollowConfig {
  id: string;
  etapa_id: string;
  funil_id: string;
  company_id: string;
  ativo: boolean;
  tempo_valor: number;
  tempo_unidade: "minutos" | "horas" | "dias";
  canal: "whatsapp" | "tarefa" | "notificacao" | "nenhum";
  template_id: string | null;
  mensagem_custom: string | null;
  criar_tarefa: boolean;
  tarefa_titulo: string | null;
  notificar_responsavel: boolean;
  avancar_proxima_etapa: boolean;
}

function tempoToMs(valor: number, unidade: string): number {
  const factor = unidade === "minutos" ? 60_000 : unidade === "horas" ? 3_600_000 : 86_400_000;
  return valor * factor;
}

function renderTemplate(tpl: string, lead: any): string {
  return tpl
    .replace(/\{\{\s*nome\s*\}\}/gi, lead.name || lead.nome || "")
    .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, (lead.name || "").split(" ")[0] || "")
    .replace(/\{\{\s*empresa\s*\}\}/gi, lead.company || "")
    .replace(/\{\{\s*servico\s*\}\}/gi, lead.servico || "");
}

function normalizePhone(p: string | null | undefined): string {
  return (p || "").replace(/\D/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const summary: any = { configs: 0, leads_checked: 0, disparos: 0, pulados: 0, erros: 0, detalhes: [] };

  // Trava local em memória para evitar duplicação dentro da mesma invocação
  const leadsProcessadosNestaRun = new Set<string>();

  try {
    const { data: configs, error: cfgErr } = await admin
      .from("follow_etapa_config")
      .select("*")
      .eq("ativo", true);

    if (cfgErr) throw cfgErr;
    summary.configs = configs?.length ?? 0;
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify(summary), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    for (const cfg of configs as FollowConfig[]) {
      const limiarMs = tempoToMs(cfg.tempo_valor, cfg.tempo_unidade);
      const limiarISO = new Date(Date.now() - limiarMs).toISOString();

      const { data: leads, error: leadsErr } = await admin
        .from("leads")
        .select("id, name, telefone, phone, company, servico, responsavel_id, last_interaction_at, last_movement_at, follow_count, etapa_id, company_id, funil_id")
        .eq("etapa_id", cfg.etapa_id)
        .eq("company_id", cfg.company_id)
        .or(`last_interaction_at.lte.${limiarISO},last_interaction_at.is.null`);

      if (leadsErr) {
        summary.erros++;
        summary.detalhes.push({ config: cfg.id, error: leadsErr.message });
        continue;
      }
      if (!leads) continue;

      const elegiveis = leads.filter((l: any) => {
        const ref = l.last_interaction_at ?? l.last_movement_at;
        if (!ref) return false;
        return new Date(ref).getTime() <= Date.now() - limiarMs;
      });

      for (const lead of elegiveis) {
        summary.leads_checked++;

        // [Trava 1] Já processado nesta mesma run (várias configs apontando para mesma etapa)
        if (leadsProcessadosNestaRun.has(lead.id)) {
          summary.pulados++;
          continue;
        }

        const movRef = lead.last_movement_at ?? lead.last_interaction_at;
        const cooldownISO = new Date(Date.now() - COOLDOWN_HORAS * 3_600_000).toISOString();

        // [Trava 2] Dedupe GLOBAL por lead — qualquer disparo desta etapa após o último movimento
        const { data: jaExecEtapa } = await admin
          .from("follow_execucoes")
          .select("id")
          .eq("lead_id", lead.id)
          .eq("etapa_id", cfg.etapa_id)
          .gte("executado_em", movRef)
          .limit(1);
        if (jaExecEtapa && jaExecEtapa.length > 0) {
          summary.pulados++;
          continue;
        }

        // [Trava 3] Cooldown de 24h: qualquer disparo (qualquer config/etapa) recente
        const { data: jaCooldown } = await admin
          .from("follow_execucoes")
          .select("id, executado_em")
          .eq("lead_id", lead.id)
          .eq("status", "sucesso")
          .gte("executado_em", cooldownISO)
          .limit(1);
        if (jaCooldown && jaCooldown.length > 0) {
          summary.pulados++;
          continue;
        }

        // [Trava 4] Respeita interação: se contato respondeu após o último disparo, não enviar
        if (lead.last_interaction_at) {
          const { data: ultimoEnvio } = await admin
            .from("follow_execucoes")
            .select("executado_em")
            .eq("lead_id", lead.id)
            .eq("status", "sucesso")
            .order("executado_em", { ascending: false })
            .limit(1);
          const ultimaExecISO = ultimoEnvio?.[0]?.executado_em;
          if (ultimaExecISO && new Date(lead.last_interaction_at) > new Date(ultimaExecISO)) {
            // contato respondeu depois do último envio → aguardar nova condição
            summary.pulados++;
            continue;
          }
        }

        const numeroNormalizado = normalizePhone(lead.telefone || lead.phone);

        // [Trava 5] Atendimento humano ativo nesta conversa
        if (numeroNormalizado) {
          const { data: atendendo } = await admin
            .from("active_attendances")
            .select("id")
            .eq("company_id", cfg.company_id)
            .eq("telefone_formatado", numeroNormalizado)
            .gte("expires_at", new Date().toISOString())
            .limit(1);
          if (atendendo && atendendo.length > 0) {
            summary.pulados++;
            continue;
          }
        }

        // [Trava 6] Coach IA / IA ativa para esta conversa — não duplicar com módulo BatePapo
        if (numeroNormalizado) {
          const { data: iaSettings } = await admin
            .from("conversation_ai_settings")
            .select("ai_mode")
            .eq("company_id", cfg.company_id)
            .eq("conversation_id", numeroNormalizado)
            .maybeSingle();
          if (iaSettings && iaSettings.ai_mode && iaSettings.ai_mode !== "off" && iaSettings.ai_mode !== "desativada") {
            // IA do BatePapo (coach/atendimento) cuida da régua — pulamos o follow do funil
            summary.pulados++;
            continue;
          }
        }

        // Marca como processado nesta run ANTES do envio
        leadsProcessadosNestaRun.add(lead.id);

        // [Anti-corrida] Insere execução em estado "enviando" antes de chamar a API externa.
        // Se outra invocação do cron rodar em paralelo, a próxima checagem de jaExecEtapa
        // já encontrará este registro.
        const { data: execRow, error: execInsertErr } = await admin
          .from("follow_execucoes")
          .insert({
            lead_id: lead.id,
            etapa_id: cfg.etapa_id,
            company_id: cfg.company_id,
            config_id: cfg.id,
            acao: cfg.canal,
            status: "enviando",
            detalhes: {},
          })
          .select("id")
          .single();

        if (execInsertErr || !execRow) {
          summary.erros++;
          summary.detalhes.push({ lead: lead.id, error: execInsertErr?.message || "insert exec falhou" });
          continue;
        }

        let acao = cfg.canal;
        let status = "sucesso";
        const detalhes: any = {};

        try {
          if (cfg.canal === "whatsapp") {
            let mensagem = cfg.mensagem_custom || "";
            if (cfg.template_id) {
              const { data: tpl } = await admin
                .from("follow_templates")
                .select("conteudo")
                .eq("id", cfg.template_id)
                .maybeSingle();
              if (tpl?.conteudo) mensagem = tpl.conteudo;
            }
            mensagem = renderTemplate(mensagem, lead);

            const numero = lead.telefone || lead.phone;
            if (!numero || !mensagem) {
              status = "erro";
              detalhes.error = "Sem número ou mensagem";
            } else {
              // ÚNICA chamada por lead/run — envio controlado
              const resp = await admin.functions.invoke("enviar-whatsapp", {
                body: {
                  numero,
                  mensagem,
                  tipo_mensagem: "text",
                  company_id: cfg.company_id,
                },
              });
              if (resp.error) {
                status = "erro";
                detalhes.error = resp.error.message;
              } else {
                detalhes.response = resp.data;
              }
            }
          } else if (cfg.canal === "tarefa" || cfg.criar_tarefa) {
            const { error: tErr } = await admin.from("tarefas" as any).insert({
              titulo: cfg.tarefa_titulo || `Follow-up: ${lead.name}`,
              lead_id: lead.id,
              company_id: cfg.company_id,
              owner_id: lead.responsavel_id,
              status: "pendente",
            });
            if (tErr) {
              status = "erro";
              detalhes.error = tErr.message;
            }
            acao = "tarefa";
          } else if (cfg.canal === "notificacao") {
            if (lead.responsavel_id) {
              await admin.from("notifications" as any).insert({
                user_id: lead.responsavel_id,
                title: "Follow-up Inteligente",
                message: `Lead ${lead.name} está parado e precisa de retorno.`,
                type: "follow_up",
              });
            }
          }

          if (cfg.notificar_responsavel && lead.responsavel_id && cfg.canal !== "notificacao") {
            await admin.from("notifications" as any).insert({
              user_id: lead.responsavel_id,
              title: "Follow-up disparado",
              message: `Follow automático enviado para ${lead.name}.`,
              type: "follow_up",
            });
          }
        } catch (e: any) {
          status = "erro";
          detalhes.error = e.message;
        }

        // Atualiza o registro de execução com status final
        await admin
          .from("follow_execucoes")
          .update({ acao, status, detalhes })
          .eq("id", execRow.id);

        if (status === "sucesso") {
          await admin
            .from("leads")
            .update({
              follow_count: (lead.follow_count ?? 0) + 1,
              last_movement_at: cfg.avancar_proxima_etapa ? new Date().toISOString() : lead.last_movement_at,
            })
            .eq("id", lead.id);

          if (cfg.avancar_proxima_etapa) {
            const { data: etapaAtual } = await admin
              .from("etapas")
              .select("posicao, funil_id")
              .eq("id", cfg.etapa_id)
              .maybeSingle();
            if (etapaAtual) {
              const { data: proxima } = await admin
                .from("etapas")
                .select("id")
                .eq("funil_id", etapaAtual.funil_id)
                .gt("posicao", etapaAtual.posicao)
                .order("posicao", { ascending: true })
                .limit(1)
                .maybeSingle();
              if (proxima?.id) {
                await admin.from("leads").update({ etapa_id: proxima.id }).eq("id", lead.id);
              }
            }
          }

          summary.disparos++;
        } else {
          summary.erros++;
        }
      }
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
