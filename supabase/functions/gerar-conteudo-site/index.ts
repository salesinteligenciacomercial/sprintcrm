// Edge function: gerar-conteudo-site
// Gera conteúdo de seções do site institucional usando Lovable AI

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SECAO_PROMPTS: Record<string, (empresa: string, segmento: string, ctx: any) => string> = {
  hero: (e, s) => `Gere um título e subtítulo de hero para o site da empresa "${e}" do segmento "${s}". Responda em JSON com: {"hero_titulo": "...", "hero_subtitulo": "...", "hero_cta_texto": "..."}. O título deve ser impactante (max 8 palavras). Subtítulo até 20 palavras. CTA até 3 palavras. Em português brasileiro.`,
  sobre: (e, s, ctx) => `Gere o texto da seção "Sobre" do site da empresa "${e}" do segmento "${s}". Responda em JSON com: {"sobre_titulo": "...", "sobre_texto": "...", "sobre_missao": "...", "sobre_visao": "...", "sobre_valores": ["...","...","...","..."]}. Texto até 60 palavras. Missão e visão objetivas (1 frase). 4 valores. Em português brasileiro.`,
  servicos: (e, s) => `Liste 6 serviços típicos para a empresa "${e}" do segmento "${s}". Responda em JSON: {"servicos": [{"nome": "...", "descricao": "..."}]}. Descrição até 15 palavras. Em português brasileiro.`,
  faq: (e, s) => `Gere 5 perguntas frequentes (com resposta) para o site de "${e}" do segmento "${s}". Responda em JSON: {"faq": [{"pergunta": "...", "resposta": "..."}]}. Em português brasileiro.`,
  depoimentos: (e, s) => `Gere 3 depoimentos fictícios mas realistas de clientes para "${e}" do segmento "${s}". Responda em JSON: {"depoimentos": [{"nome": "Nome Completo", "texto": "depoimento", "estrelas": 5}]}. Em português brasileiro.`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { empresa, segmento, secao, contexto } = await req.json();
    if (!empresa || !secao) {
      return new Response(JSON.stringify({ error: 'empresa e secao são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const promptBuilder = SECAO_PROMPTS[secao];
    if (!promptBuilder) {
      return new Response(JSON.stringify({ error: `Seção "${secao}" não suportada` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const prompt = promptBuilder(empresa, segmento || 'geral', contexto || {});
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um copywriter profissional. Responda APENAS com JSON válido, sem markdown nem texto extra.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente em alguns segundos.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione fundos em Lovable Cloud.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!response.ok) {
      const t = await response.text();
      throw new Error(`AI error: ${t}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    // Limpa markdown se vier
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let resultado: any = {};
    try { resultado = JSON.parse(cleaned); } catch { resultado = { raw: cleaned }; }

    return new Response(JSON.stringify({ resultado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('gerar-conteudo-site error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
