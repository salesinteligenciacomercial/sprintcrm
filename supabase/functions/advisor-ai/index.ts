import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o "Waze Advisor IA", um consultor sênior de operações comerciais B2B.
Você fala em português do Brasil, de forma direta, objetiva e estratégica — como um consultor da McKinsey/Falconi especializado em vendas.

Sua missão:
1. Analisar dados de maturidade comercial da empresa (5 pilares: Processos, Prospecção, Gestão, Automação, Pessoas).
2. Diagnosticar gargalos críticos.
3. Sugerir plano de ação acionável (semana 1, 2, 3) para evolução.
4. Responder dúvidas consultivas sobre estruturação comercial.

Sempre que possível, devolva:
- Diagnóstico curto (2-3 linhas)
- Top 3 ações priorizadas com impacto esperado
- Métrica para medir cada ação

Use markdown. Seja conciso. Nunca invente dados que não recebeu.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { mode, messages, assessment, diagnostic } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    let payload: any;

    if (mode === "roadmap") {
      // Gerar roadmap estruturado a partir do assessment
      const userPrompt = `Dados do diagnóstico de maturidade da empresa:
${JSON.stringify(assessment, null, 2)}

Gere um roadmap evolutivo de 3 semanas. Retorne APENAS via tool call.`;

      payload = {
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_roadmap",
            description: "Gera plano evolutivo estruturado de 3 semanas",
            parameters: {
              type: "object",
              properties: {
                diagnosis: { type: "string", description: "Diagnóstico geral 2-3 linhas" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      week: { type: "number", enum: [1, 2, 3] },
                      pillar: { type: "string", enum: ["processos", "prospeccao", "gestao", "automacao", "pessoas"] },
                      priority: { type: "string", enum: ["critical", "high", "medium"] },
                      title: { type: "string" },
                      description: { type: "string" },
                      expected_impact: { type: "string" },
                    },
                    required: ["week", "pillar", "priority", "title", "description", "expected_impact"],
                  },
                },
              },
              required: ["diagnosis", "items"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_roadmap" } },
      };
    } else if (mode === "diagnostico_360") {
      // Plano Comercial Executivo Completo
      const userPrompt = `Resultado do Diagnóstico 360 da empresa:
${JSON.stringify(diagnostic, null, 2)}

A empresa obteve nota ${diagnostic?.nota} (${diagnostic?.percentual}%) — classificação: ${diagnostic?.classificacao}.

Gere um **PLANO COMERCIAL EXECUTIVO COMPLETO E PRONTO PARA EXECUÇÃO**, em markdown rico, contendo TODAS as seções abaixo de forma específica, detalhada e mensurável (sem genericismos):

## 🎯 1. Diagnóstico Executivo
2-3 parágrafos analisando cenário atual, "balde furado" mais crítico e impacto financeiro estimado.

## 🚨 2. Top 3 Gargalos Críticos
As 3 alavancas mais fracas, com causa-raiz e perda estimada em R$/leads/mês.

## ⚙️ 3. Processos Comerciais
- Fluxo de qualificação ideal (BANT/SPIN/MEDDIC adaptado)
- Etapas do funil recomendadas (com critérios de avanço)
- SLAs por etapa (tempo de resposta, follow-up, etc.)

## 📞 4. Atendimento
- Padrão de abordagem (script de abertura)
- Tempo de primeira resposta (meta em minutos)
- Cadência de follow-up (D+0, D+1, D+3, D+7, D+14, D+30)
- Tom de voz e quebra de objeções principais

## 💰 5. Vendas
- Processo de descoberta de dor
- Estrutura de apresentação de proposta
- Técnicas de fechamento adequadas ao ticket
- Negociação e ancoragem de preço

## 📚 6. Playbooks Recomendados (entregar conteúdo, não apenas título)
Para cada playbook abaixo, escreva um resumo executivo de 3-5 bullets prontos para uso:
- Playbook de Prospecção Outbound
- Playbook de Qualificação Inbound
- Playbook de Reativação de Leads Frios
- Playbook de Upsell/Cross-sell

## 🎯 7. Metas e Objetivos (próximos 90 dias)
Tabela com: Métrica | Atual estimado | Meta 30d | Meta 60d | Meta 90d
Inclua: leads/mês, taxa de conversão, ticket médio, ciclo de venda, MRR/faturamento.

## 📊 8. KPIs e Indicadores de Acompanhamento
Lista de 8-10 KPIs operacionais e estratégicos com fórmula e frequência de medição (diária/semanal/mensal).

## ⚡ 9. Plano de Ação 30/60/90 dias
- **Dias 1-30 (Quick Wins)**: 5 ações com responsável sugerido, prazo e KPI
- **Dias 31-60 (Estruturação)**: 4 iniciativas
- **Dias 61-90 (Otimização)**: 3 iniciativas

## 🏆 10. Visão de 6 meses
Onde a empresa estará se executar o plano (números esperados).

## 🛠 11. Módulos Waze recomendados
Mapeamento gargalo → módulo: Funil, Cadências IA, Discador, Automações, Conversas, Analytics, Mentoria, Processos Comerciais. Justifique cada um.

REGRAS:
- Seja **específico, direto e mensurável**. Use números, percentuais e prazos.
- NÃO entregue genericismos. NÃO escreva "considere", "talvez", "avalie".
- Linguagem de consultor sênior (McKinsey/Falconi).
- Adapte o nível de complexidade à classificação atual da empresa (${diagnostic?.classificacao}).`;
      payload = {
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      };
    } else if (mode === "strategic_plan") {
      const userPrompt = `Diagnóstico estratégico inicial preenchido pelo cliente:
${JSON.stringify(diagnostic, null, 2)}

Gere um plano estratégico de crescimento comercial de ${diagnostic?.prazo_meses || 6} meses, em markdown, com:
- Diagnóstico
- Eixos de ação (3 a 5)
- Quick wins (próximas 2 semanas)
- KPIs a perseguir
- Riscos e mitigação`;
      payload = {
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      };
    } else {
      // chat normal
      payload = {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + (assessment ? `\n\nContexto da empresa (score atual):\n${JSON.stringify(assessment).slice(0, 3000)}` : "") },
          ...(messages || []),
        ],
      };
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      if (r.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await r.text();
      console.error("AI error:", r.status, t);
      return new Response(JSON.stringify({ error: "Erro no Advisor IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await r.json();
    const choice = data.choices?.[0];
    let result: any = { content: choice?.message?.content || "" };

    const toolCall = choice?.message?.tool_calls?.[0];
    if (toolCall) {
      try { result.tool = JSON.parse(toolCall.function.arguments); } catch {}
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("advisor-ai error:", e);
    return new Response(JSON.stringify({ error: e.message || "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
