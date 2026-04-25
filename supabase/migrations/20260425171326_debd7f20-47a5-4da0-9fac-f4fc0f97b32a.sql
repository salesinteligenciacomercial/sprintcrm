
-- ============================================================
-- WMI: Waze Maturity Index
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wmi_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  total_score INT NOT NULL DEFAULT 0,
  classification TEXT NOT NULL DEFAULT 'Inicial',
  pillar_processos INT NOT NULL DEFAULT 0,
  pillar_prospeccao INT NOT NULL DEFAULT 0,
  pillar_gestao INT NOT NULL DEFAULT 0,
  pillar_automacao INT NOT NULL DEFAULT 0,
  pillar_pessoas INT NOT NULL DEFAULT 0,
  pillar_details JSONB DEFAULT '{}'::jsonb,
  bottlenecks JSONB DEFAULT '[]'::jsonb,
  ai_insights TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wmi_assessments_company ON public.wmi_assessments(company_id, created_at DESC);
ALTER TABLE public.wmi_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wmi_assessments_company_select" ON public.wmi_assessments
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "wmi_assessments_company_insert" ON public.wmi_assessments
  FOR INSERT WITH CHECK (company_id = public.get_my_company_id());

CREATE TABLE IF NOT EXISTS public.wmi_advisor_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wmi_chats_user ON public.wmi_advisor_chats(user_id, created_at);
ALTER TABLE public.wmi_advisor_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wmi_chats_own" ON public.wmi_advisor_chats
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.wmi_roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  assessment_id UUID REFERENCES public.wmi_assessments(id) ON DELETE CASCADE,
  week INT NOT NULL DEFAULT 1,
  pillar TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  title TEXT NOT NULL,
  description TEXT,
  expected_impact TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','skipped')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wmi_roadmap_company ON public.wmi_roadmap_items(company_id, week, status);
ALTER TABLE public.wmi_roadmap_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wmi_roadmap_company" ON public.wmi_roadmap_items
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE TABLE IF NOT EXISTS public.wmi_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segmento TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_label TEXT NOT NULL,
  market_average NUMERIC NOT NULL,
  unit TEXT DEFAULT '%',
  source TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(segmento, metric_key)
);
ALTER TABLE public.wmi_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wmi_benchmarks_read" ON public.wmi_benchmarks FOR SELECT USING (true);

-- Seed benchmarks gerais
INSERT INTO public.wmi_benchmarks (segmento, metric_key, metric_label, market_average, unit) VALUES
  ('geral','conversion_rate','Taxa de conversão lead→cliente',21,'%'),
  ('geral','response_rate','Taxa de resposta em prospecção',18,'%'),
  ('geral','meeting_show_rate','Taxa de comparecimento em reuniões',62,'%'),
  ('geral','sales_cycle_days','Ciclo médio de vendas',32,'dias'),
  ('geral','followup_speed_min','Tempo médio de 1º follow-up',15,'min'),
  ('geral','crm_adoption','Adoção do CRM pela equipe',71,'%'),
  ('geral','automation_coverage','Cobertura de automações',45,'%'),
  ('geral','playbook_coverage','Cobertura de playbooks',38,'%')
ON CONFLICT (segmento, metric_key) DO NOTHING;

-- ============================================================
-- ADVISORY: Diagnóstico, trilhas, sessões, biblioteca
-- ============================================================

CREATE TABLE IF NOT EXISTS public.advisory_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  filled_by UUID NOT NULL,
  meta_faturamento NUMERIC,
  ticket_medio NUMERIC,
  tamanho_time INT,
  estagio_comercial TEXT,
  principais_gargalos TEXT[],
  segmento TEXT,
  ferramentas_atuais TEXT[],
  prazo_meses INT DEFAULT 6,
  obs TEXT,
  ai_strategic_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advisory_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advisory_diag_company" ON public.advisory_diagnostics
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE TABLE IF NOT EXISTS public.advisory_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  is_template BOOLEAN NOT NULL DEFAULT false,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT DEFAULT 'fundacao' CHECK (level IN ('fundacao','intermediario','avancado','escala')),
  cover_emoji TEXT DEFAULT '🚀',
  color TEXT DEFAULT 'blue',
  order_position INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advisory_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advisory_tracks_read" ON public.advisory_tracks
  FOR SELECT USING (is_template = true OR company_id = public.get_my_company_id());
CREATE POLICY "advisory_tracks_modify" ON public.advisory_tracks
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE TABLE IF NOT EXISTS public.advisory_track_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.advisory_tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'lesson' CHECK (content_type IN ('lesson','video','playbook','checklist','task')),
  video_url TEXT,
  content_md TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  duration_min INT,
  order_position INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advisory_modules_track ON public.advisory_track_modules(track_id, order_position);
ALTER TABLE public.advisory_track_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advisory_modules_read" ON public.advisory_track_modules
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM public.advisory_tracks t WHERE t.id = track_id 
      AND (t.is_template = true OR t.company_id = public.get_my_company_id()))
  );
CREATE POLICY "advisory_modules_modify" ON public.advisory_track_modules
  FOR ALL USING (
    EXISTS(SELECT 1 FROM public.advisory_tracks t WHERE t.id = track_id 
      AND t.company_id = public.get_my_company_id())
  ) WITH CHECK (
    EXISTS(SELECT 1 FROM public.advisory_tracks t WHERE t.id = track_id 
      AND t.company_id = public.get_my_company_id())
  );

CREATE TABLE IF NOT EXISTS public.advisory_track_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.advisory_track_modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','done')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);
ALTER TABLE public.advisory_track_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advisory_progress_own" ON public.advisory_track_progress
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.advisory_action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  session_id UUID,
  title TEXT NOT NULL,
  responsible_user_id UUID,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advisory_action_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advisory_actions_company" ON public.advisory_action_plans
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE TABLE IF NOT EXISTS public.advisory_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  is_template BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL CHECK (category IN ('cold_call','sdr','closer','objections','cadence','process','script')),
  title TEXT NOT NULL,
  description TEXT,
  content_md TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advisory_playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advisory_pb_read" ON public.advisory_playbooks
  FOR SELECT USING (is_template = true OR company_id = public.get_my_company_id());
CREATE POLICY "advisory_pb_modify" ON public.advisory_playbooks
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE TABLE IF NOT EXISTS public.advisory_revenue_calc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  scenario_name TEXT NOT NULL,
  meta_faturamento NUMERIC NOT NULL,
  ticket_medio NUMERIC NOT NULL,
  taxa_conversao NUMERIC NOT NULL,
  taxa_show NUMERIC DEFAULT 60,
  reunioes_por_sdr_mes INT DEFAULT 40,
  vendas_por_closer_mes INT DEFAULT 8,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advisory_revenue_calc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advisory_calc_company" ON public.advisory_revenue_calc
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- ============================================================
-- Seed: Trilhas template
-- ============================================================
INSERT INTO public.advisory_tracks (is_template, slug, name, description, level, cover_emoji, color, order_position) VALUES
  (true, 'fundacao-comercial', 'Fundação Comercial', 'Estruture funil, processos, papéis e SLAs do zero.', 'fundacao', '🏗️', 'blue', 1),
  (true, 'maquina-prospeccao', 'Máquina de Prospecção', 'SDR, cadências, listas, scripts e taxa de conexão.', 'intermediario', '⚙️', 'purple', 2),
  (true, 'gestao-kpis', 'Gestão e KPIs', 'Forecast, metas, conversão, CAC e ticket médio.', 'intermediario', '📊', 'emerald', 3),
  (true, 'escala-comercial', 'Escala Comercial', 'Multiplique receita com automação, IA e operação previsível.', 'escala', '🚀', 'amber', 4)
ON CONFLICT DO NOTHING;

-- Seed: playbooks template
INSERT INTO public.advisory_playbooks (is_template, category, title, description, content_md, tags) VALUES
  (true, 'cold_call', 'Cold Call B2B em 90 segundos', 'Script direto para abertura de cold call.', '# Cold Call B2B\n\n**Abertura (15s):** "Oi [nome], aqui é [seu nome] da [empresa]. Liguei rápido porque trabalho com [persona] que enfrenta [dor]. Faz sentido a gente conversar 30s?"\n\n**Conexão (30s):** Pergunta sobre dor atual.\n\n**Pitch (30s):** Como resolvemos.\n\n**Próximo passo (15s):** Reunião de 20min.', ARRAY['outbound','sdr']),
  (true, 'objections', 'Top 10 objeções e respostas', 'Banco de objeções comuns.', '# Objeções\n\n## "Está caro"\n→ "Entendo. Comparado com o quê? Geralmente clientes percebem retorno em X meses..."\n\n## "Não é prioridade agora"\n→ "Quando seria? Posso te procurar em [data]?"', ARRAY['closer','objecoes']),
  (true, 'cadence', 'Cadência outbound 12 toques', 'Cadência multicanal de 12 toques em 21 dias.', '# Cadência\n\nDia 1: LinkedIn + Email\nDia 3: Cold call\nDia 5: Email follow-up\nDia 7: Cold call + voicemail\nDia 10: LinkedIn voice note\nDia 14: Email break-up\nDia 21: Email final', ARRAY['cadencia','outbound']),
  (true, 'sdr', 'Playbook SDR completo', 'Operação diária do SDR.', '# Rotina SDR\n\n- 9h Aquecimento (15 conexões LinkedIn)\n- 9h30 Bloco cold calls (60min)\n- 11h Follow-ups\n- 14h Bloco cold calls (90min)\n- 16h Reuniões discovery\n- 17h CRM hygiene', ARRAY['sdr','rotina'])
ON CONFLICT DO NOTHING;

-- ============================================================
-- FUNÇÃO: Calcular WMI Score
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_wmi_score(p_company_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID := COALESCE(p_company_id, public.get_my_company_id());
  v_processos INT := 0;
  v_prospeccao INT := 0;
  v_gestao INT := 0;
  v_automacao INT := 0;
  v_pessoas INT := 0;
  v_total INT;
  v_class TEXT;
  v_details JSONB;
  v_funis INT; v_etapas INT; v_playbooks INT; v_pages INT;
  v_cadencias INT; v_interactions_30d INT; v_meetings_30d INT; v_queues INT;
  v_metas INT; v_won_30d INT; v_lost_30d INT; v_avg_value NUMERIC;
  v_flows INT; v_ai_agents INT; v_scripts INT; v_whatsapp_conn INT; v_calls_30d INT;
  v_users INT; v_modules_done INT; v_quests_active INT; v_team_count INT;
BEGIN
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('error','no_company');
  END IF;

  -- Pilar 1: Processos Comerciais (max 20)
  SELECT count(*) INTO v_funis FROM funis WHERE company_id = v_company_id;
  SELECT count(*) INTO v_etapas FROM etapas e JOIN funis f ON f.id = e.funil_id WHERE f.company_id = v_company_id;
  SELECT count(*) INTO v_playbooks FROM advisory_playbooks WHERE company_id = v_company_id;
  SELECT count(*) INTO v_pages FROM ai_process_suggestions WHERE company_id = v_company_id AND status = 'approved';
  v_processos := LEAST(20,
    LEAST(5, v_funis * 2) +
    LEAST(5, v_etapas) +
    LEAST(5, v_playbooks * 2) +
    LEAST(5, v_pages));

  -- Pilar 2: Prospecção (max 20)
  SELECT count(*) INTO v_queues FROM prospecting_queues WHERE company_id = v_company_id AND active = true;
  SELECT count(*) INTO v_interactions_30d FROM prospecting_interactions
    WHERE company_id = v_company_id AND interaction_date >= CURRENT_DATE - 30;
  SELECT count(*) INTO v_meetings_30d FROM prospecting_interactions
    WHERE company_id = v_company_id AND outcome = 'meeting_scheduled' AND interaction_date >= CURRENT_DATE - 30;
  SELECT count(*) INTO v_cadencias FROM cadencias WHERE company_id = v_company_id AND active = true;
  v_prospeccao := LEAST(20,
    LEAST(5, v_queues * 2) +
    LEAST(7, v_interactions_30d / 20) +
    LEAST(4, v_meetings_30d) +
    LEAST(4, v_cadencias * 2));

  -- Pilar 3: Gestão Comercial (max 20)
  SELECT count(*) INTO v_metas FROM commercial_goals WHERE company_id = v_company_id AND active = true;
  SELECT count(*) INTO v_won_30d FROM leads WHERE company_id = v_company_id AND status = 'ganho' AND won_at >= CURRENT_DATE - 30;
  SELECT count(*) INTO v_lost_30d FROM leads WHERE company_id = v_company_id AND status = 'perdido' AND lost_at >= CURRENT_DATE - 30;
  SELECT COALESCE(AVG(value),0) INTO v_avg_value FROM leads WHERE company_id = v_company_id AND status = 'ganho';
  v_gestao := LEAST(20,
    LEAST(6, v_metas * 2) +
    LEAST(6, v_won_30d) +
    LEAST(4, CASE WHEN v_won_30d + v_lost_30d > 0 THEN (v_won_30d * 100 / (v_won_30d + v_lost_30d)) / 25 ELSE 0 END) +
    LEAST(4, CASE WHEN v_avg_value > 0 THEN 4 ELSE 0 END));

  -- Pilar 4: Automação e Tecnologia (max 20)
  SELECT count(*) INTO v_flows FROM workflow_automations WHERE company_id = v_company_id AND active = true;
  SELECT count(*) INTO v_ai_agents FROM ia_agents WHERE company_id = v_company_id AND active = true;
  SELECT count(*) INTO v_scripts FROM commercial_scripts WHERE company_id = v_company_id;
  SELECT count(*) INTO v_whatsapp_conn FROM whatsapp_connections WHERE company_id = v_company_id AND status = 'connected';
  SELECT count(*) INTO v_calls_30d FROM call_history WHERE company_id = v_company_id AND call_start >= CURRENT_DATE - 30;
  v_automacao := LEAST(20,
    LEAST(5, v_flows) +
    LEAST(5, v_ai_agents * 2) +
    LEAST(3, v_scripts) +
    LEAST(3, v_whatsapp_conn * 3) +
    LEAST(4, v_calls_30d / 25));

  -- Pilar 5: Pessoas e Performance (max 20)
  SELECT count(*) INTO v_users FROM user_roles WHERE company_id = v_company_id;
  SELECT count(*) INTO v_modules_done FROM advisory_track_progress WHERE company_id = v_company_id AND status = 'done';
  SELECT count(*) INTO v_quests_active FROM prospecting_quests WHERE company_id = v_company_id AND active = true;
  SELECT count(*) INTO v_team_count FROM sales_teams WHERE company_id = v_company_id;
  v_pessoas := LEAST(20,
    LEAST(5, v_users) +
    LEAST(6, v_modules_done) +
    LEAST(5, v_quests_active * 2) +
    LEAST(4, v_team_count * 2));

  v_total := v_processos + v_prospeccao + v_gestao + v_automacao + v_pessoas;

  v_class := CASE
    WHEN v_total >= 80 THEN 'Escalável'
    WHEN v_total >= 60 THEN 'Previsível'
    WHEN v_total >= 35 THEN 'Estruturando'
    ELSE 'Inicial'
  END;

  v_details := jsonb_build_object(
    'processos', jsonb_build_object('score', v_processos, 'max', 20, 'metrics', jsonb_build_object(
      'funis', v_funis, 'etapas', v_etapas, 'playbooks', v_playbooks, 'pages_aprovadas', v_pages)),
    'prospeccao', jsonb_build_object('score', v_prospeccao, 'max', 20, 'metrics', jsonb_build_object(
      'queues_ativas', v_queues, 'interacoes_30d', v_interactions_30d, 'reunioes_30d', v_meetings_30d, 'cadencias', v_cadencias)),
    'gestao', jsonb_build_object('score', v_gestao, 'max', 20, 'metrics', jsonb_build_object(
      'metas_ativas', v_metas, 'wins_30d', v_won_30d, 'perdidos_30d', v_lost_30d, 'ticket_medio', v_avg_value)),
    'automacao', jsonb_build_object('score', v_automacao, 'max', 20, 'metrics', jsonb_build_object(
      'fluxos_ativos', v_flows, 'agentes_ia', v_ai_agents, 'scripts', v_scripts, 'whatsapp_conectado', v_whatsapp_conn, 'chamadas_30d', v_calls_30d)),
    'pessoas', jsonb_build_object('score', v_pessoas, 'max', 20, 'metrics', jsonb_build_object(
      'usuarios', v_users, 'modulos_concluidos', v_modules_done, 'quests_ativas', v_quests_active, 'times', v_team_count))
  );

  RETURN jsonb_build_object(
    'company_id', v_company_id,
    'total_score', v_total,
    'classification', v_class,
    'pillars', v_details,
    'calculated_at', now()
  );
END;
$$;
