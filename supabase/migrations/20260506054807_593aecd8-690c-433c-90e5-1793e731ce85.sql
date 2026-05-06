-- Payment history table tracking all paid, bypassed, and promo events across services
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_key TEXT NOT NULL, -- e.g. realtor_signup, realtor_renewal, property_sale, property_rent
  service_label TEXT NOT NULL,
  related_type TEXT, -- 'realtor' | 'property'
  related_id UUID,
  related_label TEXT, -- friendly name (property title / realtor name)
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL, -- 'paid' | 'bypassed' | 'promotion' | 'free'
  promo_label TEXT,
  processed_by UUID, -- the auth user who processed it (admin or user themselves)
  processed_by_role TEXT, -- 'admin' | 'user' | 'self'
  processed_by_name TEXT,
  expiration_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment history"
ON public.payment_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment history"
ON public.payment_history FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert their own payment history"
ON public.payment_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payment history"
ON public.payment_history FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete payment history"
ON public.payment_history FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX idx_payment_history_related ON public.payment_history(related_type, related_id);
CREATE INDEX idx_payment_history_created_at ON public.payment_history(created_at DESC);