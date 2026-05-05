CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NOT NULL THEN
    NEW.updated_by := uid;
  END IF;
  RETURN NEW;
END;
$$;