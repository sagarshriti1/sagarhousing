
CREATE TABLE public.realtors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}'::TEXT[],
  years_experience INTEGER,
  license_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.realtors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view realtors" ON public.realtors
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can insert their own realtor profile" ON public.realtors
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own realtor profile" ON public.realtors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own realtor profile" ON public.realtors
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
