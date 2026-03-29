-- Drop overly permissive storage policies
DROP POLICY IF EXISTS "Auth users upload portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete portfolio" ON storage.objects;

-- Upload: only business owners, into their own business folder
CREATE POLICY "Business owners upload portfolio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'portfolio-images'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  );

-- Delete: only the owning business owner
CREATE POLICY "Business owners delete portfolio" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'portfolio-images'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  );