ALTER TABLE public.pre_sdr_analyses
  ADD COLUMN IF NOT EXISTS attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attempts_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamp with time zone;