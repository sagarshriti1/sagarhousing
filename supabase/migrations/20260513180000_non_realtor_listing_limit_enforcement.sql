
-- Seed the feature flag for non-realtor listing limit
INSERT INTO public.feature_flags (key, label, description, fee, bypass_payment)
VALUES (
  'non_realtor_limit_bypass',
  'Standard User Listing Limit',
  'When enabled, standard (non-realtor) users are capped at the specified listing count. When disabled, they can post unlimited listings.',
  2,
  true
)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- Function to check listing limit
CREATE OR REPLACE FUNCTION public.check_user_listing_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  is_realtor BOOLEAN;
  limit_active BOOLEAN;
  max_listings INTEGER;
  current_count INTEGER;
BEGIN
  -- 1. Check if user is admin or realtor (they have no limit)
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin') INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'realtor') INTO is_realtor;
  IF is_realtor THEN
    RETURN NEW;
  END IF;

  -- 2. Check if the limit feature flag is active
  SELECT bypass_payment, fee INTO limit_active, max_listings
  FROM public.feature_flags
  WHERE key = 'non_realtor_limit_bypass';

  -- If flag doesn't exist or is not active, no limit
  IF NOT FOUND OR NOT limit_active THEN
    RETURN NEW;
  END IF;

  -- 3. Count existing properties for this user
  SELECT COUNT(*) INTO current_count
  FROM public.user_properties
  WHERE user_id = NEW.user_id;

  -- 4. Enforce limit
  IF current_count >= max_listings THEN
    RAISE EXCEPTION 'You have reached the limit of % listings for standard accounts. Please delete an existing listing or upgrade to a Realtor account.', max_listings;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to enforce limit on insert
DROP TRIGGER IF EXISTS tr_enforce_listing_limit ON public.user_properties;
CREATE TRIGGER tr_enforce_listing_limit
BEFORE INSERT ON public.user_properties
FOR EACH ROW EXECUTE FUNCTION public.check_user_listing_limit();
