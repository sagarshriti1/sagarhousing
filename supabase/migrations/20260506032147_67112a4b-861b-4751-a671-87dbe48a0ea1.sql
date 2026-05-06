ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street_address text;
ALTER TABLE public.realtors ADD COLUMN IF NOT EXISTS street_address text;