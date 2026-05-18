ALTER TABLE public.nvoip_config 
  ADD COLUMN IF NOT EXISTS user_token text,
  ADD COLUMN IF NOT EXISTS napikey text,
  ADD COLUMN IF NOT EXISTS login_email text;