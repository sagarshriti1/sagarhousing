ALTER TABLE public.user_properties
  ADD COLUMN IF NOT EXISTS maintenance_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bike_parking integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS car_parking integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stories integer DEFAULT 0;

-- Make state and zip_code nullable since we're removing them from the form
ALTER TABLE public.user_properties
  ALTER COLUMN state SET DEFAULT '',
  ALTER COLUMN zip_code SET DEFAULT '';