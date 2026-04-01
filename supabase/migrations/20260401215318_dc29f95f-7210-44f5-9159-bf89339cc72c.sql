-- Create storage bucket for realtor profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('realtor-photos', 'realtor-photos', true);

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload realtor photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'realtor-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update their own realtor photos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'realtor-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own realtor photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'realtor-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow anyone to view realtor photos (public bucket)
CREATE POLICY "Anyone can view realtor photos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'realtor-photos');

-- Admins can manage all realtor photos
CREATE POLICY "Admins can manage all realtor photos" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'realtor-photos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'realtor-photos' AND public.has_role(auth.uid(), 'admin'));