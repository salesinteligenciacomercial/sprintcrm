-- Catálogo de alavancas
CREATE TABLE public.diagnostico_alavancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  foco TEXT NOT NULL,
  descricao TEXT,
  icon TEXT,
  cor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perguntas de cada alavanca
CREATE TABLE public.diagnostico_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alavanca_id UUID NOT NULL REFERENCES public.diagnostico_alavancas(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  pergunta TEXT NOT NULL,
  peso INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Avaliações realizadas
CREATE TABLE public.diagnostico_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID,
  pontuacoes JSONB NOT NULL DEFAULT '{}'::jsonb, -- { alavanca_id: score 0-10 }
  respostas_perguntas JSONB DEFAULT '{}'::jsonb, -- { pergunta_id: bool/nota }
  total_score NUMERIC NOT NULL DEFAULT 0,
  percentual NUMERIC NOT NULL DEFAULT 0,
  nota TEXT NOT NULL DEFAULT 'D', -- A, B, C, D
  classificacao TEXT,
  diagnostico_ia TEXT,
  plano_acao_ia JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_diag_resp_company ON public.diagnostico_respostas(company_id, created_at DESC);
CREATE INDEX idx_diag_perg_alav ON public.diagnostico_perguntas(alavanca_id, ordem);

-- RLS
ALTER TABLE public.diagnostico_alavancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostico_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostico_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalogo alavancas visivel autenticados"
  ON public.diagnostico_alavancas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Catalogo perguntas visivel autenticados"
  ON public.diagnostico_perguntas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Empresa ve suas respostas"
  ON public.diagnostico_respostas FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Empresa cria respostas"
  ON public.diagnostico_respostas FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Empresa atualiza suas respostas"
  ON public.diagnostico_respostas FOR UPDATE TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Empresa deleta suas respostas"
  ON public.diagnostico_respostas FOR DELETE TO authenticated
  USING (company_id = public.get_my_company_id());

-- Seed alavancas
INSERT INTO public.diagnostico_alavancas (numero, nome, foco, descricao, icon, cor) VALUES
(1, 'Captação Estratégica de Leads', 'Atrair leads qualificados com consistência, controle de custo e segmentação.', 'Geração e qualificação de demanda', 'Target', 'from-blue-500 to-cyan-400'),
(2, 'Conversão e Processos Comerciais', 'Transformar leads em vendas com alta taxa de conversão.', 'Funil, scripts, follow-up e CRM', 'TrendingUp', 'from-purple-500 to-fuchsia-400'),
(3, 'Fidelização, LTV e Retorno', 'Maximizar o ciclo de vida do cliente e gerar previsibilidade.', 'Recompra, reativação e LTV', 'Heart', 'from-pink-500 to-rose-400'),
(4, 'Gestão da Equipe e Experiência', 'Encantar o cliente com atendimento padronizado e equipe treinada.', 'Time, treinamento e cultura', 'Users', 'from-emerald-500 to-green-400'),
(5, 'Crescimento Escalável e Previsibilidade', 'Crescer com controle, margem e inteligência de dados.', 'KPIs, expansão e gestão de dados', 'BarChart3', 'from-amber-500 to-orange-400');

-- Seed perguntas
WITH a AS (SELECT id, numero FROM public.diagnostico_alavancas)
INSERT INTO public.diagnostico_perguntas (alavanca_id, ordem, pergunta) 
SELECT a.id, p.ordem, p.pergunta FROM a JOIN (VALUES
-- Alavanca 1: Captação
(1, 1, 'Você sabe quantos leads/mês a empresa gera atualmente?'),
(1, 2, 'Você identifica quais canais geram mais clientes (Instagram, Google, indicações)?'),
(1, 3, 'A empresa trabalha com influenciadores, parcerias ou co-marketing?'),
(1, 4, 'As campanhas são segmentadas por persona/produto/serviço?'),
(1, 5, 'O Google Meu Negócio está ativo, com avaliações e fotos reais?'),
-- Alavanca 2: Conversão
(2, 1, 'A empresa possui funis diferentes por especialidade/serviço?'),
(2, 2, 'Quem atende leads segue script com gatilhos de autoridade, prova e urgência?'),
(2, 3, 'Existe script padronizado de atendimento documentado?'),
(2, 4, 'A resposta é feita em menos de 5 minutos no horário comercial?'),
(2, 5, 'Há automação para atendimento fora do horário?'),
(2, 6, 'O time de atendimento possui metas de conversão?'),
(2, 7, 'Existe acompanhamento de taxa de agendamento e comparecimento?'),
(2, 8, 'A empresa utiliza CRM ou funil comercial estruturado?'),
(2, 9, 'Há follow-up ativo para quem não finalizou a compra?'),
-- Alavanca 3: Fidelização
(3, 1, 'Existe programa de retorno (consultas, pacotes, planos)?'),
(3, 2, 'Você acompanha a taxa de retorno dos clientes em até 90 dias?'),
(3, 3, 'Existe plano ativo de reativação de inativos?'),
(3, 4, 'A empresa acompanha o LTV (lifetime value) médio por cliente?'),
(3, 5, 'A empresa oferece planos de assinatura ou pacotes recorrentes?'),
(3, 6, 'Há lembretes automáticos de retorno (WhatsApp/SMS)?'),
(3, 7, 'A equipe está treinada para oferecer upgrades ou cross-sell?'),
(3, 8, 'São feitas campanhas de venda recorrente para a base atual?'),
-- Alavanca 4: Equipe
(4, 1, 'A empresa aplica treinamentos regulares (vendas, objeções, experiência)?'),
(4, 2, 'A equipe conhece o perfil dos clientes e adapta a abordagem por persona?'),
(4, 3, 'Há metas comerciais mensais claras para recepção/captação?'),
(4, 4, 'Existe mapa da jornada do cliente do primeiro contato ao pós-venda?'),
(4, 5, 'Existe treinamento de vendas e atendimento documentado?'),
(4, 6, 'Todos seguem o mesmo roteiro e linguagem de abordagem?'),
(4, 7, 'São realizadas reuniões semanais de alinhamento?'),
(4, 8, 'É feita pesquisa de satisfação com os clientes (NPS)?'),
-- Alavanca 5: Escala
(5, 1, 'Você acompanha mensalmente CPL, CAC, ticket médio e LTV?'),
(5, 2, 'Sabe quanto pode investir em marketing sem afetar caixa?'),
(5, 3, 'Tem CRM com dashboard de vendas e agendamentos?'),
(5, 4, 'Trabalha com previsibilidade de agendamentos com 2+ semanas?'),
(5, 5, 'Conhece o ticket médio e LTV dos clientes?'),
(5, 6, 'Há controle real do CAC (custo por cliente)?'),
(5, 7, 'O marketing é planejado com base em metas claras?'),
(5, 8, 'Existe plano de expansão ou novos serviços previstos?'),
(5, 9, 'O time está preparado para aumento de demanda?')
) AS p(numero, ordem, pergunta) ON p.numero = a.numero;
