CREATE POLICY "Admins can insert any realtor"
ON public.realtors
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));