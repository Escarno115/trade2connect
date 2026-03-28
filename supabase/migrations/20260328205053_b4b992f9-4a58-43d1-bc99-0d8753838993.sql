ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{}';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS office_address text DEFAULT '';