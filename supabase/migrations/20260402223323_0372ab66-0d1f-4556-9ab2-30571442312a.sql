ALTER TABLE public.user_properties 
  ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expiration_date timestamp with time zone DEFAULT NULL;