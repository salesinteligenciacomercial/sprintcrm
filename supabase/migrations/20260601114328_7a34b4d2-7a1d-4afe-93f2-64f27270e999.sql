GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_goals TO authenticated;
GRANT ALL ON public.commercial_goals TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_goal_progress(UUID, TEXT) TO authenticated;