
-- Corrigir RLS de diagnostico_gargalos_corrigidos para isolar por conta ativa
DROP POLICY IF EXISTS "Gargalos por empresa - select" ON public.diagnostico_gargalos_corrigidos;
DROP POLICY IF EXISTS "Gargalos por empresa - update" ON public.diagnostico_gargalos_corrigidos;
DROP POLICY IF EXISTS "Gargalos por empresa - delete" ON public.diagnostico_gargalos_corrigidos;
DROP POLICY IF EXISTS "Gargalos por empresa - insert" ON public.diagnostico_gargalos_corrigidos;

CREATE POLICY "Gargalos por empresa - select"
  ON public.diagnostico_gargalos_corrigidos FOR SELECT
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Gargalos por empresa - insert"
  ON public.diagnostico_gargalos_corrigidos FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Gargalos por empresa - update"
  ON public.diagnostico_gargalos_corrigidos FOR UPDATE
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Gargalos por empresa - delete"
  ON public.diagnostico_gargalos_corrigidos FOR DELETE
  USING (company_id = public.get_my_company_id());

-- Corrigir RLS de prospecting_daily_logs para isolar por conta ativa
DROP POLICY IF EXISTS "Users can view company prospecting logs" ON public.prospecting_daily_logs;
DROP POLICY IF EXISTS "Users can insert company prospecting logs" ON public.prospecting_daily_logs;
DROP POLICY IF EXISTS "Users can update company prospecting logs" ON public.prospecting_daily_logs;
DROP POLICY IF EXISTS "Users can delete company prospecting logs" ON public.prospecting_daily_logs;

CREATE POLICY "Users can view company prospecting logs"
  ON public.prospecting_daily_logs FOR SELECT
  USING (company_id = public.get_my_company_id());

CREATE POLICY "Users can insert company prospecting logs"
  ON public.prospecting_daily_logs FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Users can update company prospecting logs"
  ON public.prospecting_daily_logs FOR UPDATE
  USING (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "Users can delete company prospecting logs"
  ON public.prospecting_daily_logs FOR DELETE
  USING (company_id = public.get_my_company_id());
