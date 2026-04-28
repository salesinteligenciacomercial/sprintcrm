const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `Você é um estrategista comercial sênior (Aaron Ross + Thiago Reis + Diego Wagner). Dado um NICHO e o SEGMENTO/PRODUTOS da empresa que vende, gere um diagnóstico estratégico COMPLETO em pt-BR, com perfil firmográfico, comportamento de compra, dores, desejos, crenças, mapa de decisão, estratégia por canal (cold call, WhatsApp, LinkedIn, e-mail, social selling), plano de ação 30 dias, casamento com produto e Lead Score. Seja ESPECÍFICO, prático, com números realistas e scripts reais. Sem generalidades.`;

// PARTE A: Perfil + Comportamento + Dores + Desejos + Crenças + Scoring + Lead Score
const TOOL_A = {
  type: "function",
  function: {
    name: "icp_part_a",
    description: "Parte A do ICP: perfil, comportamento de compra, dores, desejos, crenças, scoring e lead score.",
    parameters: {
      type: "object",
      properties: {
        profile: {
          type: "object",
          properties: {
            segmento: { type: "string" },
            subnichos: { type: "array", items: { type: "string" } },
            faturamento_mensal: { type: "string" },
            funcionarios: { type: "string" },
            estrutura_comercial: { type: "string" },
            ticket_medio_estimado: { type: "string" },
            ltv_estimado: { type: "string" },
            maturidade_comercial: { type: "string", enum: ["baixa", "média", "alta"] },
          },
          required: ["segmento", "subnichos", "faturamento_mensal", "funcionarios", "estrutura_comercial", "ticket_medio_estimado", "ltv_estimado", "maturidade_comercial"],
        },
        buying_behavior: {
          type: "object",
          properties: {
            gatilhos_compra: { type: "array", items: { type: "string" } },
            padrao_consumo: { type: "string" },
            jornada_decisao: { type: "array", items: { type: "string" } },
            ciclo_medio_dias: { type: "string" },
            momento_ideal_abordagem: { type: "string" },
            sinais_de_intencao: { type: "array", items: { type: "string" } },
          },
          required: ["gatilhos_compra", "padrao_consumo", "jornada_decisao", "ciclo_medio_dias", "momento_ideal_abordagem", "sinais_de_intencao"],
        },
        pains: {
          type: "object",
          properties: {
            explicitas: { type: "array", items: { type: "string" } },
            latentes: { type: "array", items: { type: "string" } },
            gargalos: { type: "array", items: { type: "string" } },
          },
          required: ["explicitas", "latentes", "gargalos"],
        },
        desires: { type: "array", items: { type: "string" } },
        beliefs: {
          type: "object",
          properties: {
            tentativas_frustradas: { type: "array", items: { type: "string" } },
            objecoes: { type: "array", items: { type: "string" } },
            motivos_falha: { type: "array", items: { type: "string" } },
          },
          required: ["tentativas_frustradas", "objecoes", "motivos_falha"],
        },
        scoring: {
          type: "object",
          properties: {
            fit_score: { type: "integer", minimum: 0, maximum: 100 },
            fit_label: { type: "string" },
            cac_estimado: { type: "string" },
            ltv_estimado: { type: "string" },
            potencial_fechamento: { type: "string", enum: ["baixo", "médio", "alto"] },
          },
          required: ["fit_score", "fit_label", "cac_estimado", "ltv_estimado", "potencial_fechamento"],
        },
        lead_score_criteria: {
          type: "array",
          description: "Critérios e pesos para Lead Score (devem somar 100)",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              weight: { type: "integer" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    label: { type: "string" },
                    score: { type: "integer", minimum: 0, maximum: 100 },
                  },
                  required: ["value", "label", "score"],
                },
              },
            },
            required: ["key", "label", "weight", "options"],
          },
        },
      },
      required: ["profile", "buying_behavior", "pains", "desires", "beliefs", "scoring", "lead_score_criteria"],
    },
  },
};

// PARTE B: Decisão + Canais + Prospecção + Plano de Ação + Product Fit
const TOOL_B = {
  type: "function",
  function: {
    name: "icp_part_b",
    description: "Parte B do ICP: mapa de decisão, estratégia por canal, prospecção, plano de ação e product fit.",
    parameters: {
      type: "object",
      properties: {
        decision_map: {
          type: "object",
          properties: {
            decisores: { type: "array", items: { type: "string" } },
            influenciadores: { type: "array", items: { type: "string" } },
            bloqueadores: { type: "array", items: { type: "string" } },
            abordagens: { type: "array", items: { type: "string" } },
            melhores_horarios: { type: "array", items: { type: "string" } },
            objecoes_comuns: { type: "array", items: { type: "string" } },
            canais_recomendados: { type: "array", items: { type: "string" } },
          },
          required: ["decisores", "influenciadores", "bloqueadores", "abordagens", "melhores_horarios", "objecoes_comuns", "canais_recomendados"],
        },
        channel_strategy: {
          type: "object",
          properties: {
            cold_call: { type: "object", properties: { quando_usar: { type: "string" }, abertura: { type: "string" }, eficacia: { type: "string", enum: ["baixa", "média", "alta"] } }, required: ["quando_usar", "abertura", "eficacia"] },
            whatsapp: { type: "object", properties: { quando_usar: { type: "string" }, abertura: { type: "string" }, eficacia: { type: "string", enum: ["baixa", "média", "alta"] } }, required: ["quando_usar", "abertura", "eficacia"] },
            linkedin: { type: "object", properties: { quando_usar: { type: "string" }, abertura: { type: "string" }, eficacia: { type: "string", enum: ["baixa", "média", "alta"] } }, required: ["quando_usar", "abertura", "eficacia"] },
            email: { type: "object", properties: { quando_usar: { type: "string" }, abertura: { type: "string" }, eficacia: { type: "string", enum: ["baixa", "média", "alta"] } }, required: ["quando_usar", "abertura", "eficacia"] },
            social_selling: { type: "object", properties: { quando_usar: { type: "string" }, abertura: { type: "string" }, eficacia: { type: "string", enum: ["baixa", "média", "alta"] } }, required: ["quando_usar", "abertura", "eficacia"] },
            ordem_recomendada: { type: "array", items: { type: "string" } },
          },
          required: ["cold_call", "whatsapp", "linkedin", "email", "social_selling", "ordem_recomendada"],
        },
        prospecting_strategy: {
          type: "object",
          properties: {
            cadencia: { type: "string" },
            canais: { type: "array", items: { type: "string" } },
            script_inicial: { type: "string" },
            sequencia_sdr: { type: "array", items: { type: "string" } },
          },
          required: ["cadencia", "canais", "script_inicial", "sequencia_sdr"],
        },
        action_plan: {
          type: "object",
          properties: {
            primeiros_30_dias: { type: "array", items: { type: "string" } },
            metas_semanais: { type: "array", items: { type: "string" } },
            kpis_acompanhamento: { type: "array", items: { type: "string" } },
            riscos_e_mitigacao: { type: "array", items: { type: "string" } },
          },
          required: ["primeiros_30_dias", "metas_semanais", "kpis_acompanhamento", "riscos_e_mitigacao"],
        },
        product_fit: {
          type: "object",
          properties: {
            oferta_principal: { type: "string" },
            angulo_pitch: { type: "string" },
            prova_social_ideal: { type: "string" },
            upsell_natural: { type: "string" },
            why_now: { type: "string" },
          },
          required: ["oferta_principal", "angulo_pitch", "prova_social_ideal", "upsell_natural", "why_now"],
        },
      },
      required: ["decision_map", "channel_strategy", "prospecting_strategy", "action_plan", "product_fit"],
    },
  },
};

async function callAI(apiKey: string, userContent: string, tool: any, label: string) {
  const t0 = Date.now();
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
    }),
  });
  console.log(`[ICP:${label}] Status ${resp.status} em ${Date.now() - t0}ms`);
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI Gateway ${resp.status}: ${t.slice(0, 200)}`);
  }
  const raw = await resp.text();
  if (!raw || !raw.trim()) throw new Error(`Resposta vazia (${label})`);
  const data = JSON.parse(raw);
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error(`Sem tool_call (${label})`);
  return JSON.parse(call.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { niche, segmento, produtos } = body || {};
    if (!niche || typeof niche !== "string") {
      return new Response(JSON.stringify({ error: "niche obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ctxLines: string[] = [`Nicho-alvo do ICP: "${niche}"`];
    if (segmento) ctxLines.push(`Segmento da empresa que vende: "${segmento}"`);
    if (Array.isArray(produtos) && produtos.length) {
      const list = produtos.slice(0, 15).map((p: any) => `- ${p.nome || p.name}${p.preco ? ` (R$ ${p.preco})` : ""}${p.descricao ? `: ${p.descricao}` : ""}`).join("\n");
      ctxLines.push(`Portfólio de produtos/serviços da empresa:\n${list}`);
    }
    ctxLines.push("Use esse contexto para casar dores do ICP com as ofertas e gerar um plano agressivo e realista para o mercado brasileiro.");
    const userContent = ctxLines.join("\n\n");

    console.log("[ICP] Iniciando geração paralela para:", niche);
    const tStart = Date.now();

    const [partA, partB] = await Promise.all([
      callAI(apiKey, userContent, TOOL_A, "A"),
      callAI(apiKey, userContent, TOOL_B, "B"),
    ]);

    const intelligence = { ...partA, ...partB };
    console.log("[ICP] Sucesso total em", Date.now() - tStart, "ms");

    return new Response(JSON.stringify({ niche, intelligence }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[ICP] erro:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
