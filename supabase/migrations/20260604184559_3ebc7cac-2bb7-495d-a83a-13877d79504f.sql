
CREATE TABLE public.evolution_version_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_version text,
  latest_available_version text,
  last_check_at timestamptz,
  last_restart_at timestamptz,
  last_status text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.evolution_version_state TO authenticated;
GRANT ALL ON public.evolution_version_state TO service_role;
ALTER TABLE public.evolution_version_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins read state" ON public.evolution_version_state
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.evolution_version_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_version text,
  new_version text,
  status_before text,
  status_after text,
  success boolean NOT NULL DEFAULT false,
  error text,
  trigger text NOT NULL DEFAULT 'cron',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.evolution_version_history TO authenticated;
GRANT ALL ON public.evolution_version_history TO service_role;
ALTER TABLE public.evolution_version_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admins read history" ON public.evolution_version_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.evolution_version_state (id) VALUES (gen_random_uuid());
