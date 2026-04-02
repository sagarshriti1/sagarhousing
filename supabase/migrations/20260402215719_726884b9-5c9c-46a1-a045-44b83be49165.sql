CREATE TABLE public.saved_realtors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  realtor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, realtor_id)
);

ALTER TABLE public.saved_realtors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved realtors"
  ON public.saved_realtors FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save realtors"
  ON public.saved_realtors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave realtors"
  ON public.saved_realtors FOR DELETE TO authenticated
  USING (auth.uid() = user_id);