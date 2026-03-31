-- Fix 1: Portfolio storage policies - drop broken ones and recreate with correct field
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

-- Fix 2: Tighten reviews table SELECT - remove public access
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

CREATE POLICY "Involved parties view reviews" ON public.reviews
FOR SELECT USING (
  auth.uid() = customer_id
  OR EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = reviews.business_id AND businesses.owner_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);