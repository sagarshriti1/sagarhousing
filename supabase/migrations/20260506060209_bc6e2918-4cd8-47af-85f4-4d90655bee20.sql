
-- Backfill payment_history for existing realtors (where we have a user_id)
INSERT INTO public.payment_history (
  user_id, service_key, service_label,
  related_type, related_id, related_label,
  amount, status, processed_by_role, processed_by_name,
  expiration_date, notes, created_at
)
SELECT
  r.user_id,
  'realtor_signup',
  'Realtor Signup',
  'realtor',
  r.id,
  r.name,
  CASE WHEN r.payment_status = 'paid' THEN COALESCE((SELECT fee FROM public.feature_flags WHERE key='realtor_signup' LIMIT 1), 0) ELSE 0 END,
  CASE
    WHEN r.payment_bypassed THEN 'bypassed'
    WHEN r.payment_status = 'paid' THEN 'paid'
    ELSE 'free'
  END,
  CASE WHEN r.payment_bypassed THEN 'admin' ELSE 'self' END,
  NULL,
  CASE WHEN r.expiration_date IS NOT NULL THEN r.expiration_date::timestamptz ELSE NULL END,
  'Backfilled from existing realtor record.',
  COALESCE(r.created_at, now())
FROM public.realtors r
WHERE r.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.payment_history p
    WHERE p.related_type = 'realtor' AND p.related_id = r.id
  );

-- Backfill payment_history for existing user_properties
INSERT INTO public.payment_history (
  user_id, service_key, service_label,
  related_type, related_id, related_label,
  amount, status, processed_by_role, processed_by_name,
  expiration_date, notes, created_at
)
SELECT
  p.user_id,
  CASE WHEN p.listing_type = 'rent' THEN 'property_listing_rent' ELSE 'property_listing_sale' END,
  CASE WHEN p.listing_type = 'rent' THEN 'Property Listing — For Rent' ELSE 'Property Listing — For Sale' END,
  'property',
  p.id,
  p.title,
  CASE
    WHEN p.payment_date IS NOT NULL THEN COALESCE((
      SELECT fee FROM public.feature_flags
      WHERE key = CASE WHEN p.listing_type = 'rent' THEN 'property_listing_rent' ELSE 'property_listing_sale' END
      LIMIT 1
    ), 0)
    ELSE 0
  END,
  CASE
    WHEN p.payment_date IS NOT NULL THEN 'paid'
    WHEN p.status = 'active' THEN 'free'
    ELSE 'free'
  END,
  'self',
  NULL,
  p.expiration_date,
  'Backfilled from existing property record.',
  COALESCE(p.created_at, now())
FROM public.user_properties p
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_history ph
  WHERE ph.related_type = 'property' AND ph.related_id = p.id
);
