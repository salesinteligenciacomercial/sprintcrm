DROP POLICY IF EXISTS "Super admins manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Admins update their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins update own company" ON public.companies;

CREATE POLICY "Super admins manage all companies"
ON public.companies
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admins update own company"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = companies.id
      AND ur.role = 'company_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = companies.id
      AND ur.role = 'company_admin'
  )
);