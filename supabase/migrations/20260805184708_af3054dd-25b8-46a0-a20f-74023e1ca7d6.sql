DROP TRIGGER IF EXISTS trg_auto_approve_business_prelaunch ON public.businesses;
DROP FUNCTION IF EXISTS public.auto_approve_business_prelaunch();
ALTER TABLE public.businesses ALTER COLUMN verification_status SET DEFAULT 'pending'::public.verification_status;