-- Backfill: link existing un-linked realtors to users by email (case-insensitive)
UPDATE public.realtors r
   SET user_id = p.user_id, updated_at = now()
  FROM public.profiles p
 WHERE r.user_id IS NULL
   AND r.email IS NOT NULL
   AND p.email IS NOT NULL
   AND lower(r.email) = lower(p.email);

-- Auto-link trigger: when a new user signs up, attach their id to any realtor row
-- that was pre-created with the same email and has no user_id yet.
CREATE OR REPLACE FUNCTION public.link_realtor_on_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.realtors
       SET user_id = NEW.id, updated_at = now()
     WHERE user_id IS NULL
       AND email IS NOT NULL
       AND lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_realtor ON auth.users;
CREATE TRIGGER on_auth_user_created_link_realtor
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_realtor_on_new_user();