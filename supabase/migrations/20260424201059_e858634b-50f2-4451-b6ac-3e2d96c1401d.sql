-- ============================================
-- ROTEIROS COMERCIAIS — Tabelas
-- ============================================

-- 1. Roteiros principais
CREATE TABLE public.commercial_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'geral',
  active BOOLEAN NOT NULL DEFAULT true,
  triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_node_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Nós do fluxo
CREATE TABLE public.commercial_script_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.commercial_scripts(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x NUMERIC NOT NULL DEFAULT 0,
  position_y NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Conexões entre nós
CREATE TABLE public.commercial_script_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL REFERENCES public.commercial_scripts(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.commercial_script_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.commercial_script_nodes(id) ON DELETE CASCADE,
  source_handle TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Execuções em andamento
CREATE TABLE public.commercial_script_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  script_id UUID NOT NULL REFERENCES public.commercial_scripts(id) ON DELETE CASCADE,
  conversation_id UUID,
  lead_id UUID,
  telefone_formatado TEXT,
  current_node_id UUID,
  status TEXT NOT NULL DEFAULT 'running',
  next_run_at TIMESTAMPTZ,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_type TEXT DEFAULT 'manual',
  started_by UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Logs de execução
CREATE TABLE public.commercial_script_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.commercial_script_executions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  node_id UUID,
  node_type TEXT,
  action_taken TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_cs_company ON public.commercial_scripts(company_id);
CREATE INDEX idx_cs_active ON public.commercial_scripts(company_id, active);
CREATE INDEX idx_csn_script ON public.commercial_script_nodes(script_id);
CREATE INDEX idx_cse_script ON public.commercial_script_edges(script_id);
CREATE INDEX idx_cse_source ON public.commercial_script_edges(source_node_id);
CREATE INDEX idx_csex_status ON public.commercial_script_executions(company_id, status);
CREATE INDEX idx_csex_next_run ON public.commercial_script_executions(next_run_at) WHERE status = 'running';
CREATE INDEX idx_csex_conversation ON public.commercial_script_executions(conversation_id);
CREATE INDEX idx_cslogs_execution ON public.commercial_script_logs(execution_id);

-- RLS
ALTER TABLE public.commercial_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_script_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_script_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_script_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_script_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: commercial_scripts
CREATE POLICY "Company members manage scripts"
ON public.commercial_scripts FOR ALL
USING (company_id = public.get_my_company_id() OR public.is_super_admin())
WITH CHECK (company_id = public.get_my_company_id() OR public.is_super_admin());

-- Políticas: nodes
CREATE POLICY "Company members manage script nodes"
ON public.commercial_script_nodes FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.commercial_scripts s
  WHERE s.id = script_id
    AND (s.company_id = public.get_my_company_id() OR public.is_super_admin())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.commercial_scripts s
  WHERE s.id = script_id
    AND (s.company_id = public.get_my_company_id() OR public.is_super_admin())
));

-- Políticas: edges
CREATE POLICY "Company members manage script edges"
ON public.commercial_script_edges FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.commercial_scripts s
  WHERE s.id = script_id
    AND (s.company_id = public.get_my_company_id() OR public.is_super_admin())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.commercial_scripts s
  WHERE s.id = script_id
    AND (s.company_id = public.get_my_company_id() OR public.is_super_admin())
));

-- Políticas: executions
CREATE POLICY "Company members manage executions"
ON public.commercial_script_executions FOR ALL
USING (company_id = public.get_my_company_id() OR public.is_super_admin())
WITH CHECK (company_id = public.get_my_company_id() OR public.is_super_admin());

-- Políticas: logs
CREATE POLICY "Company members view logs"
ON public.commercial_script_logs FOR SELECT
USING (company_id = public.get_my_company_id() OR public.is_super_admin());

CREATE POLICY "Service can insert logs"
ON public.commercial_script_logs FOR INSERT
WITH CHECK (true);

-- Triggers updated_at
CREATE TRIGGER trg_cs_updated_at BEFORE UPDATE ON public.commercial_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_csn_updated_at BEFORE UPDATE ON public.commercial_script_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_csex_updated_at BEFORE UPDATE ON public.commercial_script_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime para o painel de execuções
ALTER PUBLICATION supabase_realtime ADD TABLE public.commercial_script_executions;