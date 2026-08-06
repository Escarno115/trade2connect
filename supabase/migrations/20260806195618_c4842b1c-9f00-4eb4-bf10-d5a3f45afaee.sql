DROP POLICY IF EXISTS "Owners upload verification docs" ON storage.objects;

CREATE POLICY "Owners upload verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND lower(COALESCE(metadata->>'mimetype', '')) IN ('application/pdf','image/jpeg','image/png','image/webp')
  AND lower(name) ~ '\.(pdf|jpe?g|png|webp)$'
);

ALTER TABLE public.verification_documents
  ADD CONSTRAINT verification_documents_file_ext_chk
  CHECK (lower(file_url) ~ '\.(pdf|jpe?g|png|webp)$');