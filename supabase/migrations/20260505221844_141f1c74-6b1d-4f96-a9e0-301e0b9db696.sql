-- Track who last updated each record (admin actions)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.realtors ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.user_properties ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  BEGIN
    NEW.updated_by = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    NEW.updated_by = NEW.updated_by;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_by_profiles ON public.profiles;
CREATE TRIGGER set_updated_by_profiles
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_updated_by_realtors ON public.realtors;
CREATE TRIGGER set_updated_by_realtors
BEFORE INSERT OR UPDATE ON public.realtors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_updated_by_user_roles ON public.user_roles;
CREATE TRIGGER set_updated_by_user_roles
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

DROP TRIGGER IF EXISTS set_updated_by_user_properties ON public.user_properties;
CREATE TRIGGER set_updated_by_user_properties
BEFORE INSERT OR UPDATE ON public.user_properties
FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();