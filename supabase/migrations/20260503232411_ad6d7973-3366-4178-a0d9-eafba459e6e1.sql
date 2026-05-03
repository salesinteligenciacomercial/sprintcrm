ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assigned_to uuid;

UPDATE public.tasks
SET assigned_to = assignee_id
WHERE assigned_to IS NULL
  AND assignee_id IS NOT NULL;

UPDATE public.tasks
SET assignee_id = assigned_to
WHERE assignee_id IS NULL
  AND assigned_to IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_tasks_assignee_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.assignee_id IS NULL AND NEW.assigned_to IS NOT NULL THEN
    NEW.assignee_id := NEW.assigned_to;
  END IF;

  IF NEW.assigned_to IS NULL AND NEW.assignee_id IS NOT NULL THEN
    NEW.assigned_to := NEW.assignee_id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
      NEW.assigned_to := NEW.assignee_id;
    ELSIF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      NEW.assignee_id := NEW.assigned_to;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_tasks_assignee_fields_trigger ON public.tasks;
CREATE TRIGGER sync_tasks_assignee_fields_trigger
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_tasks_assignee_fields();