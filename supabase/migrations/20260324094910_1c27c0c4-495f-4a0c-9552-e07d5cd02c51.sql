
-- Create public portfolio-images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-images', 'portfolio-images', true);

-- Create portfolio_images table
CREATE TABLE public.portfolio_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view portfolio images
CREATE POLICY "Portfolio images are public" ON public.portfolio_images
  FOR SELECT USING (true);

-- Business owners can insert their own images
CREATE POLICY "Owners insert portfolio images" ON public.portfolio_images
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = portfolio_images.business_id AND businesses.owner_id = auth.uid())
  );

-- Business owners can delete their own images
CREATE POLICY "Owners delete portfolio images" ON public.portfolio_images
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = portfolio_images.business_id AND businesses.owner_id = auth.uid())
  );

-- Storage RLS: anyone can view
CREATE POLICY "Public portfolio read" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio-images');

-- Storage RLS: authenticated users can upload to their folder
CREATE POLICY "Auth users upload portfolio" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'portfolio-images' AND auth.role() = 'authenticated');

-- Storage RLS: owners can delete their uploads
CREATE POLICY "Auth users delete portfolio" ON storage.objects
  FOR DELETE USING (bucket_id = 'portfolio-images' AND auth.role() = 'authenticated');
