-- Pre-launch: auto-approve businesses while document verification is paused.
-- Approve all currently pending businesses so they're visible during the seeding phase.
UPDATE public.businesses
SET verification_status = 'approved'
WHERE verification_status = 'pending';

-- Trigger to auto-approve newly created businesses during the paused phase.
CREATE OR REPLACE FUNCTION public.auto_approve_business_prelaunch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- While verification is paused pre-launch, mark new businesses as approved
  NEW.verification_status := 'approved';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_business_prelaunch ON public.businesses;
CREATE TRIGGER trg_auto_approve_business_prelaunch
BEFORE INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_business_prelaunch();