
-- ============ PROSPECÇÃO: ICP + Lead Score + Calculadora ============

CREATE TABLE IF NOT EXISTS public.icp_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  -- Critérios e pesos (somam 100)
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- ex: [{"key":"segmento","label":"Segmento","weight":20,"options":[{"value":"saude","score":100}]}]
  hot_threshold INTEGER NOT NULL DEFAULT 75,
  warm_threshold INTEGER NOT NULL DEFAULT 50,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icp_profiles_company ON public.icp_profiles(company_id);

ALTER TABLE public.icp_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "icp_company_select" ON public.icp_profiles
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "icp_company_insert" ON public.icp_profiles
  FOR INSERT WITH CHECK (company_id = public.get_my_company_id());
CREATE POLICY "icp_company_update" ON public.icp_profiles
  FOR UPDATE USING (company_id = public.get_my_company_id());
CREATE POLICY "icp_company_delete" ON public.icp_profiles
  FOR DELETE USING (company_id = public.get_my_company_id());

-- Lead Score (cache calculado)
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  icp_profile_id UUID REFERENCES public.icp_profiles(id) ON DELETE SET NULL,
  icp_score INTEGER NOT NULL DEFAULT 0,        -- fit ao ICP (0-100)
  engagement_score INTEGER NOT NULL DEFAULT 0, -- comportamento (0-100)
  total_score INTEGER NOT NULL DEFAULT 0,
  temperature TEXT NOT NULL DEFAULT 'frio',    -- frio | morno | quente
  reasons JSONB DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_company ON public.lead_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_temp ON public.lead_scores(company_id, temperature, total_score DESC);

ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_scores_company_select" ON public.lead_scores
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "lead_scores_company_all" ON public.lead_scores
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- Calculadora Máquina de Vendas
CREATE TABLE IF NOT EXISTS public.sales_machine_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Cenário Padrão',
  -- Inputs
  revenue_goal NUMERIC NOT NULL DEFAULT 0,
  ticket_medio NUMERIC NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 20,         -- %
  meeting_show_rate NUMERIC NOT NULL DEFAULT 70,-- %
  lead_to_meeting_rate NUMERIC NOT NULL DEFAULT 15, -- %
  cycle_days INTEGER NOT NULL DEFAULT 30,
  pipeline_coverage NUMERIC NOT NULL DEFAULT 3, -- 3x
  sdr_capacity_per_day INTEGER NOT NULL DEFAULT 30,
  closer_capacity_per_day INTEGER NOT NULL DEFAULT 4,
  -- Outputs cacheados
  sales_needed INTEGER,
  meetings_needed INTEGER,
  leads_needed INTEGER,
  pipeline_value NUMERIC,
  sdrs_needed NUMERIC,
  closers_needed NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_machine_company ON public.sales_machine_configs(company_id);

ALTER TABLE public.sales_machine_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sm_company_select" ON public.sales_machine_configs
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "sm_company_all" ON public.sales_machine_configs
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- Colunas auxiliares no leads (espelho do score para queries rápidas)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS icp_score INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_temperature TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_score INTEGER;

-- ============ MATURIDADE: Alertas de Regressão ============

CREATE TABLE IF NOT EXISTS public.wmi_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  alert_type TEXT NOT NULL, -- regression | improvement | milestone
  severity TEXT NOT NULL DEFAULT 'medium', -- low | medium | high
  pillar TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  delta_score NUMERIC,
  previous_assessment_id UUID,
  current_assessment_id UUID,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wmi_alerts_company ON public.wmi_alerts(company_id, acknowledged, created_at DESC);

ALTER TABLE public.wmi_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wmi_alerts_company_select" ON public.wmi_alerts
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "wmi_alerts_company_all" ON public.wmi_alerts
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- Trigger: gera alertas automáticos quando há regressão entre assessments
CREATE OR REPLACE FUNCTION public.detect_wmi_regression()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev RECORD;
  delta NUMERIC;
  pillar_keys TEXT[] := ARRAY['pillar_processos','pillar_prospeccao','pillar_gestao','pillar_automacao','pillar_pessoas'];
  pk TEXT;
  prev_p NUMERIC;
  curr_p NUMERIC;
  pillar_label TEXT;
BEGIN
  SELECT * INTO prev FROM public.wmi_assessments
   WHERE company_id = NEW.company_id AND id <> NEW.id
   ORDER BY created_at DESC LIMIT 1;

  IF prev IS NULL THEN RETURN NEW; END IF;

  delta := NEW.total_score - prev.total_score;

  IF delta <= -5 THEN
    INSERT INTO public.wmi_alerts(company_id, alert_type, severity, title, message, delta_score, previous_assessment_id, current_assessment_id)
    VALUES (NEW.company_id, 'regression',
      CASE WHEN delta <= -15 THEN 'high' WHEN delta <= -10 THEN 'medium' ELSE 'low' END,
      'Regressão no WMI Score',
      format('Seu score caiu %s pontos (de %s para %s). Reveja gargalos.', abs(delta), prev.total_score, NEW.total_score),
      delta, prev.id, NEW.id);
  ELSIF delta >= 10 THEN
    INSERT INTO public.wmi_alerts(company_id, alert_type, severity, title, message, delta_score, previous_assessment_id, current_assessment_id)
    VALUES (NEW.company_id, 'improvement', 'low',
      'Evolução significativa do WMI',
      format('Parabéns! Seu score subiu %s pontos (de %s para %s).', delta, prev.total_score, NEW.total_score),
      delta, prev.id, NEW.id);
  END IF;

  -- Detecta regressão por pilar (-3 ou mais)
  FOREACH pk IN ARRAY pillar_keys LOOP
    EXECUTE format('SELECT ($1).%I, ($2).%I', pk, pk) INTO prev_p, curr_p USING prev, NEW;
    pillar_label := replace(pk, 'pillar_', '');
    IF curr_p IS NOT NULL AND prev_p IS NOT NULL AND (curr_p - prev_p) <= -3 THEN
      INSERT INTO public.wmi_alerts(company_id, alert_type, severity, pillar, title, message, delta_score, previous_assessment_id, current_assessment_id)
      VALUES (NEW.company_id, 'regression', 'medium', pillar_label,
        format('Regressão no pilar %s', initcap(pillar_label)),
        format('O pilar %s caiu %s pontos. Priorize ações neste pilar.', initcap(pillar_label), abs(curr_p - prev_p)),
        curr_p - prev_p, prev.id, NEW.id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wmi_regression ON public.wmi_assessments;
CREATE TRIGGER trg_wmi_regression
  AFTER INSERT ON public.wmi_assessments
  FOR EACH ROW EXECUTE FUNCTION public.detect_wmi_regression();

-- Seed de benchmarks por segmento (opcional, ignora se já existir)
INSERT INTO public.wmi_benchmarks(segmento, metric_key, metric_label, market_average, unit, source) VALUES
  ('saude', 'win_rate', 'Taxa de Conversão', 22, '%', 'Mercado Saúde 2024'),
  ('saude', 'cycle_days', 'Ciclo de Vendas', 35, 'dias', 'Mercado Saúde 2024'),
  ('saas', 'win_rate', 'Taxa de Conversão', 18, '%', 'SaaS Brasil 2024'),
  ('saas', 'cycle_days', 'Ciclo de Vendas', 45, 'dias', 'SaaS Brasil 2024'),
  ('servicos', 'win_rate', 'Taxa de Conversão', 25, '%', 'Serviços B2B 2024'),
  ('servicos', 'cycle_days', 'Ciclo de Vendas', 28, 'dias', 'Serviços B2B 2024')
ON CONFLICT DO NOTHING;

-- ============ PROCESSOS COMERCIAIS: Adoção + OTE ============

CREATE TABLE IF NOT EXISTS public.playbook_adoption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  playbook_id UUID NOT NULL,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  applied_count INTEGER NOT NULL DEFAULT 0,
  last_applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(playbook_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_playbook_adoption_company ON public.playbook_adoption(company_id);

ALTER TABLE public.playbook_adoption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pb_adoption_company_select" ON public.playbook_adoption
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "pb_adoption_company_all" ON public.playbook_adoption
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- Planos de comissionamento (OTE)
CREATE TABLE IF NOT EXISTS public.commission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'closer', -- sdr | closer | gestor
  base_salary NUMERIC NOT NULL DEFAULT 0,
  ote_target NUMERIC NOT NULL DEFAULT 0,            -- on-target earnings (anual)
  variable_pct NUMERIC NOT NULL DEFAULT 50,         -- % do OTE que é variável
  quota_monthly NUMERIC NOT NULL DEFAULT 0,
  commission_pct NUMERIC NOT NULL DEFAULT 5,        -- % sobre vendas
  accelerator_threshold NUMERIC DEFAULT 100,        -- % da meta a partir do qual acelera
  accelerator_multiplier NUMERIC DEFAULT 1.5,
  -- Comissão por etapa do funil (json: {"reuniao": 50, "proposta": 100})
  stage_kickers JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_plans_company ON public.commission_plans(company_id);

ALTER TABLE public.commission_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_plans_company_select" ON public.commission_plans
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "comm_plans_company_all" ON public.commission_plans
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- Simulações salvas
CREATE TABLE IF NOT EXISTS public.commission_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  plan_id UUID REFERENCES public.commission_plans(id) ON DELETE CASCADE,
  user_id UUID,
  scenario_name TEXT,
  achievement_pct NUMERIC NOT NULL DEFAULT 100,
  sales_value NUMERIC NOT NULL DEFAULT 0,
  computed_payout NUMERIC,
  computed_total_earnings NUMERIC,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_sims_company ON public.commission_simulations(company_id);

ALTER TABLE public.commission_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_sims_company_select" ON public.commission_simulations
  FOR SELECT USING (company_id = public.get_my_company_id());
CREATE POLICY "comm_sims_company_all" ON public.commission_simulations
  FOR ALL USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- Updated_at triggers
CREATE TRIGGER trg_icp_profiles_updated BEFORE UPDATE ON public.icp_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_machine_updated BEFORE UPDATE ON public.sales_machine_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_commission_plans_updated BEFORE UPDATE ON public.commission_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
