
-- Funis de follow-up
CREATE TABLE public.follow_up_funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Funil Padrão',
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_up_funnels_company ON public.follow_up_funnels(company_id);

ALTER TABLE public.follow_up_funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follow_up_funnels_company_select"
  ON public.follow_up_funnels FOR SELECT
  USING (company_id = ANY (public.user_company_ids_array()));

CREATE POLICY "follow_up_funnels_company_all"
  ON public.follow_up_funnels FOR ALL
  USING (company_id = ANY (public.user_company_ids_array()))
  WITH CHECK (company_id = ANY (public.user_company_ids_array()));

-- Etapas
CREATE TABLE public.follow_up_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL REFERENCES public.follow_up_funnels(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#22C55E',
  order_index int NOT NULL DEFAULT 0,
  is_terminal boolean NOT NULL DEFAULT false,
  terminal_status text CHECK (terminal_status IN ('completed','lost') OR terminal_status IS NULL),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_follow_up_stages_funnel ON public.follow_up_stages(funnel_id, order_index);

ALTER TABLE public.follow_up_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follow_up_stages_company_select"
  ON public.follow_up_stages FOR SELECT
  USING (company_id = ANY (public.user_company_ids_array()));

CREATE POLICY "follow_up_stages_company_all"
  ON public.follow_up_stages FOR ALL
  USING (company_id = ANY (public.user_company_ids_array()))
  WITH CHECK (company_id = ANY (public.user_company_ids_array()));

-- stage_id em follow_up_entries
ALTER TABLE public.follow_up_entries
  ADD COLUMN stage_id uuid REFERENCES public.follow_up_stages(id) ON DELETE SET NULL;

CREATE INDEX idx_follow_up_entries_stage ON public.follow_up_entries(stage_id);

-- Função: garante funil default + etapas seed
CREATE OR REPLACE FUNCTION public.ensure_default_follow_up_funnel(p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funnel_id uuid;
BEGIN
  SELECT id INTO v_funnel_id
  FROM public.follow_up_funnels
  WHERE company_id = p_company_id AND is_default = true
  LIMIT 1;

  IF v_funnel_id IS NULL THEN
    INSERT INTO public.follow_up_funnels (company_id, name, is_default)
    VALUES (p_company_id, 'Funil Padrão', true)
    RETURNING id INTO v_funnel_id;

    INSERT INTO public.follow_up_stages (funnel_id, company_id, name, color, order_index, is_terminal, terminal_status) VALUES
      (v_funnel_id, p_company_id, 'A Iniciar',   '#94A3B8', 0, false, NULL),
      (v_funnel_id, p_company_id, 'Em contato',  '#3B82F6', 1, false, NULL),
      (v_funnel_id, p_company_id, 'Negociando',  '#F59E0B', 2, false, NULL),
      (v_funnel_id, p_company_id, 'Ganho',       '#22C55E', 3, true,  'completed'),
      (v_funnel_id, p_company_id, 'Perdido',     '#EF4444', 4, true,  'lost');
  END IF;

  RETURN v_funnel_id;
END;
$$;

-- Função: move card para outra etapa (e ajusta status se terminal)
CREATE OR REPLACE FUNCTION public.move_follow_up_to_stage(
  p_entry_id uuid,
  p_stage_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_terminal boolean;
  v_terminal_status text;
BEGIN
  SELECT is_terminal, terminal_status
    INTO v_terminal, v_terminal_status
  FROM public.follow_up_stages
  WHERE id = p_stage_id;

  UPDATE public.follow_up_entries
  SET stage_id = p_stage_id,
      status = CASE
        WHEN v_terminal AND v_terminal_status = 'completed' THEN 'completed'
        WHEN v_terminal AND v_terminal_status = 'lost' THEN 'lost'
        WHEN NOT v_terminal AND status IN ('completed','lost','cooled') THEN 'active'
        ELSE status
      END,
      outcome = CASE
        WHEN v_terminal AND v_terminal_status = 'completed' THEN COALESCE(outcome, 'sale')
        WHEN v_terminal AND v_terminal_status = 'lost' THEN COALESCE(outcome, 'lost')
        ELSE outcome
      END
  WHERE id = p_entry_id;
END;
$$;
