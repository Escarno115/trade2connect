
-- Add country and phone_verified columns to businesses
ALTER TABLE public.businesses ADD COLUMN country text NOT NULL DEFAULT '';
ALTER TABLE public.businesses ADD COLUMN phone_verified boolean NOT NULL DEFAULT false;
