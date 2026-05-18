ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS google_task_id text,
  ADD COLUMN IF NOT EXISTS google_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_source text NOT NULL DEFAULT 'crm';
CREATE INDEX IF NOT EXISTS idx_tasks_google_task_id ON public.tasks(google_task_id);