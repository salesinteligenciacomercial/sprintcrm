
-- Tabela para registrar bloqueios da URA (automation flow skip events)
CREATE TABLE IF NOT EXISTS public.automation_skip_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  telefone TEXT NOT NULL,
  flow_id UUID NULL,
  motivo TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_skip_logs_company_tel_created
  ON public.automation_skip_logs (company_id, telefone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_skip_logs_company_created
  ON public.automation_skip_logs (company_id, created_at DESC);

ALTER TABLE public.automation_skip_logs ENABLE ROW LEVEL SECURITY;

-- Visualização: usuário vê os logs da própria empresa; super_admin vê tudo
CREATE POLICY "skip_logs_select_own_company"
  ON public.automation_skip_logs FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR company_id IN (SELECT public.get_user_company_ids())
  );

-- Inserção: bloqueada para clientes (apenas service role das edge functions insere)
CREATE POLICY "skip_logs_insert_super_admin_only"
  ON public.automation_skip_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- Limpeza diária de registros antigos (>7 dias)
CREATE OR REPLACE FUNCTION public.purge_automation_skip_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.automation_skip_logs
  WHERE created_at < now() - interval '7 days';
$$;
