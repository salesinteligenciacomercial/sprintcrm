CREATE TABLE public.nvoip_virtual_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  label TEXT,
  city TEXT,
  state TEXT,
  number_type TEXT DEFAULT 'fixo',
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  is_default_caller_id BOOLEAN NOT NULL DEFAULT false,
  monthly_cost NUMERIC(10,2),
  renewal_date DATE,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, phone_number)
);

ALTER TABLE public.nvoip_virtual_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view virtual numbers"
ON public.nvoip_virtual_numbers FOR SELECT TO authenticated
USING (company_id = ANY (public.user_company_ids_array()));

CREATE POLICY "Company members can insert virtual numbers"
ON public.nvoip_virtual_numbers FOR INSERT TO authenticated
WITH CHECK (company_id = ANY (public.user_company_ids_array()));

CREATE POLICY "Company members can update virtual numbers"
ON public.nvoip_virtual_numbers FOR UPDATE TO authenticated
USING (company_id = ANY (public.user_company_ids_array()));

CREATE POLICY "Company members can delete virtual numbers"
ON public.nvoip_virtual_numbers FOR DELETE TO authenticated
USING (company_id = ANY (public.user_company_ids_array()));

CREATE TRIGGER update_nvoip_virtual_numbers_updated_at
BEFORE UPDATE ON public.nvoip_virtual_numbers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_nvoip_virtual_numbers_company ON public.nvoip_virtual_numbers(company_id);