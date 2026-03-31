
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create property type and listing type enums
CREATE TYPE public.property_type AS ENUM ('house', 'condo', 'townhouse', 'apartment');
CREATE TYPE public.listing_type AS ENUM ('sale', 'rent');
CREATE TYPE public.listing_status AS ENUM ('active', 'pending', 'sold', 'rented');

-- Create user_properties table
CREATE TABLE public.user_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  price NUMERIC NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 0,
  bathrooms NUMERIC NOT NULL DEFAULT 0,
  sqft INTEGER,
  property_type public.property_type NOT NULL DEFAULT 'house',
  listing_type public.listing_type NOT NULL DEFAULT 'sale',
  year_built INTEGER,
  lot_size NUMERIC,
  garage_spaces INTEGER DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  status public.listing_status NOT NULL DEFAULT 'active',
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active properties" ON public.user_properties FOR SELECT USING (status = 'active' OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own properties" ON public.user_properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own properties" ON public.user_properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own properties" ON public.user_properties FOR DELETE USING (auth.uid() = user_id);

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_properties_updated_at BEFORE UPDATE ON public.user_properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

CREATE POLICY "Property images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
CREATE POLICY "Users can upload property images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their property images" ON storage.objects FOR UPDATE USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their property images" ON storage.objects FOR DELETE USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
