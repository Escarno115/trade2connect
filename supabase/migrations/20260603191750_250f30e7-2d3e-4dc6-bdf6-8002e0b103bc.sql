
-- 1. Link invoices to the upgrade request that produced them
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS subscription_request_id uuid
  REFERENCES public.subscription_requests(id) ON DELETE SET NULL;

-- 2. Allow system/trigger context (no auth.uid()) to update protected business fields,
--    so DB triggers can sync subscription_tier / expires_at.
CREATE OR REPLACE FUNCTION public.protect_business_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin') THEN
    NEW.verification_status := OLD.verification_status;
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.phone_verified := OLD.phone_verified;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. When an invoice flips to 'paid', upgrade the business tier and extend expiry.
--    When an invoice flips to 'cancelled'/'overdue'/'failed' and was the most recent
--    paid invoice (i.e. nothing left active), nothing to do — expiry handles that.
CREATE OR REPLACE FUNCTION public.apply_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier public.subscription_tier;
  _interval interval;
  _current_expiry timestamptz;
  _new_expiry timestamptz;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    _tier := NEW.subscription_tier::public.subscription_tier;
    _interval := CASE WHEN NEW.billing_cycle = 'weekly'
                      THEN INTERVAL '7 days'
                      ELSE INTERVAL '1 month' END;

    SELECT subscription_expires_at INTO _current_expiry
      FROM public.businesses WHERE id = NEW.business_id;

    -- Stack onto current expiry if it's still in the future, otherwise start from now
    IF _current_expiry IS NOT NULL AND _current_expiry > now() THEN
      _new_expiry := _current_expiry + _interval;
    ELSE
      _new_expiry := now() + _interval;
    END IF;

    UPDATE public.businesses
      SET subscription_tier = _tier,
          billing_cycle = NEW.billing_cycle,
          subscription_expires_at = _new_expiry
      WHERE id = NEW.business_id;

    -- Mark the linked upgrade request approved
    IF NEW.subscription_request_id IS NOT NULL THEN
      UPDATE public.subscription_requests
        SET status = 'approved'
        WHERE id = NEW.subscription_request_id
          AND status <> 'approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_invoice_payment ON public.invoices;
CREATE TRIGGER trg_apply_invoice_payment
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.apply_invoice_payment();

-- 4. Downgrade businesses to free once their paid period elapses.
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  UPDATE public.businesses
    SET subscription_tier = 'free',
        subscription_expires_at = NULL
    WHERE subscription_tier <> 'free'
      AND subscription_expires_at IS NOT NULL
      AND subscription_expires_at < now();
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- 5. Schedule the expiry sweep hourly (pure SQL, no HTTP needed)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('expire-subscriptions-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-subscriptions-hourly',
  '15 * * * *',
  $cmd$ SELECT public.expire_subscriptions(); $cmd$
);
