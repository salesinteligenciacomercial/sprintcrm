CREATE OR REPLACE FUNCTION public.get_capture_page(_identifier text)
RETURNS TABLE (id uuid, name text, capture_page_config jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try by UUID first
  IF _identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
      SELECT c.id, c.name, c.capture_page_config
      FROM public.companies c
      WHERE c.id = _identifier::uuid
      LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Otherwise lookup by slug inside capture_page_config JSON
  RETURN QUERY
    SELECT c.id, c.name, c.capture_page_config
    FROM public.companies c
    WHERE c.capture_page_config IS NOT NULL
      AND c.capture_page_config->>'slug' = _identifier
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_capture_page(text) TO anon, authenticated;