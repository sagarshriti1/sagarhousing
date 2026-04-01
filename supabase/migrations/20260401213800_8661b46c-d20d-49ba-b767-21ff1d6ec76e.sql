
ALTER TABLE public.realtors ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Allow admins to update any realtor (for featuring and editing)
CREATE POLICY "Admins can update any realtor"
  ON public.realtors FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any realtor"
  ON public.realtors FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage all user_properties
CREATE POLICY "Admins can update any property"
  ON public.user_properties FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any property"
  ON public.user_properties FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all properties (including non-active)
CREATE POLICY "Admins can view all properties"
  ON public.user_properties FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
