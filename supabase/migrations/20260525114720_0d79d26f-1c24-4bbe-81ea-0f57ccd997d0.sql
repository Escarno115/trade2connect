
-- Force safe defaults on INSERT so owners cannot self-verify or grant themselves paid tiers
CREATE OR REPLACE FUNCTION public.enforce_business_insert_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    -- Pre-launch auto-approve trigger will still flip verification_status to 'approved' afterwards if active
    NEW.subscription_tier := 'free';
    NEW.subscription_expires_at := NULL;
    NEW.phone_verified := false;
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_business_insert_defaults() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS trg_enforce_business_insert_defaults ON public.businesses;
CREATE TRIGGER trg_enforce_business_insert_defaults
BEFORE INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_business_insert_defaults();
