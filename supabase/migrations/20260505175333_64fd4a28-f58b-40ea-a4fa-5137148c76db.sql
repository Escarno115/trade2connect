ALTER TYPE service_category ADD VALUE IF NOT EXISTS 'detailing';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS requires_license boolean NOT NULL DEFAULT false;