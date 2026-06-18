GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_pages TO authenticated;
GRANT ALL ON public.process_pages TO service_role;
GRANT SELECT ON public.process_pages TO anon;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;

GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) TO service_role;