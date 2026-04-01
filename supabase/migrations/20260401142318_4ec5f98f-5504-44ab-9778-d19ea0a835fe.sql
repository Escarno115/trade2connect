-- Fix portfolio storage policies: replace businesses.name with name (storage object path)
DROP POLICY IF EXISTS "Business owners upload portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Business owners update portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Business owners delete portfolio" ON storage.objects;

CREATE POLICY "Business owners upload portfolio" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'portfolio-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.owner_id = auth.uid()
      AND (businesses.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Business owners update portfolio" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'portfolio-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.owner_id = auth.uid()
      AND (businesses.id)::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Business owners delete portfolio" ON storage.objects
FOR DELETE USING (
  bucket_id = 'portfolio-images'
  AND EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.owner_id = auth.uid()
      AND (businesses.id)::text = (storage.foldername(name))[1]
  )
);