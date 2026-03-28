
-- Add billing_cycle to businesses
ALTER TABLE public.businesses ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly';

-- Create invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  subscription_tier text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  due_date date NOT NULL,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Owners view own invoices
CREATE POLICY "Owners view own invoices" ON public.invoices
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = invoices.business_id AND businesses.owner_id = auth.uid()));

-- Admins manage all invoices
CREATE POLICY "Admins manage invoices" ON public.invoices
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Function to generate invoices for businesses with paid tiers
CREATE OR REPLACE FUNCTION public.generate_subscription_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  biz RECORD;
  price numeric;
  next_due date;
BEGIN
  FOR biz IN
    SELECT id, subscription_tier, billing_cycle
    FROM public.businesses
    WHERE subscription_tier IN ('basic', 'pro')
      AND is_active = true
  LOOP
    -- Determine price
    IF biz.billing_cycle = 'weekly' THEN
      price := CASE biz.subscription_tier
        WHEN 'basic' THEN 12.50
        WHEN 'pro' THEN 25
        ELSE 0
      END;
      next_due := CURRENT_DATE + INTERVAL '7 days';
    ELSE
      price := CASE biz.subscription_tier
        WHEN 'basic' THEN 50
        WHEN 'pro' THEN 100
        ELSE 0
      END;
      next_due := CURRENT_DATE + INTERVAL '1 month';
    END IF;

    -- Only create if no pending/unpaid invoice exists for this business
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices
      WHERE business_id = biz.id AND status = 'pending'
    ) THEN
      INSERT INTO public.invoices (business_id, amount, billing_cycle, subscription_tier, status, due_date)
      VALUES (biz.id, price, biz.billing_cycle, biz.subscription_tier, 'pending', next_due);
    END IF;
  END LOOP;
END;
$$;
