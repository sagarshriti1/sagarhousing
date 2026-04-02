ALTER TABLE public.user_properties ADD COLUMN IF NOT EXISTS district text NOT NULL DEFAULT '';
ALTER TABLE public.realtors ADD COLUMN IF NOT EXISTS district text NOT NULL DEFAULT '';