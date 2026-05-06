-- Feature flags table for controlling payment bypass and fees per service
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  fee NUMERIC NOT NULL DEFAULT 0,
  bypass_payment BOOLEAN NOT NULL DEFAULT false,
  promo_label TEXT,
  promo_ends_at TIMESTAMPTZ,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert feature flags"
  ON public.feature_flags FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update feature flags"
  ON public.feature_flags FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete feature flags"
  ON public.feature_flags FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_feature_flags_updated_by
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

-- Seed the known services
INSERT INTO public.feature_flags (key, label, description, fee) VALUES
  ('property_listing_sale', 'Property Listing — For Sale', 'One-time fee to publish a property listed for sale.', 5000),
  ('property_listing_rent', 'Property Listing — For Rent', 'One-time fee to publish a property listed for rent.', 1000),
  ('realtor_signup', 'Realtor Profile Signup', 'Monthly fee for a new realtor to create a profile and appear in the directory.', 5000),
  ('realtor_renewal', 'Realtor Subscription Renewal', 'Monthly fee for an existing realtor to renew their expired profile.', 5000),
  ('featured_realtor', 'Featured / Advertised Realtor', 'Optional fee for a realtor to be marked featured (currently free).', 0);