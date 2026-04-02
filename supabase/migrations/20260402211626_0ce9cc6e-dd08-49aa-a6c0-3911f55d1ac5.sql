ALTER TABLE public.realtors
  ADD COLUMN start_date date,
  ADD COLUMN expiration_date date,
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN payment_bypassed boolean NOT NULL DEFAULT false;