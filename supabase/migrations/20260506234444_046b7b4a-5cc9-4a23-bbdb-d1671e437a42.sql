ALTER TABLE public.realtors
  ADD COLUMN IF NOT EXISTS featured_start_date date,
  ADD COLUMN IF NOT EXISTS featured_expiration_date date,
  ADD COLUMN IF NOT EXISTS featured_payment_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS featured_payment_bypassed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_bypass_reason text;