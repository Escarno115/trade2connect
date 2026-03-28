
-- Subscription upgrade requests table
CREATE TABLE public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requested_tier subscription_tier NOT NULL,
  current_tier subscription_tier NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- Business owners can view their own requests
CREATE POLICY "Owners view own requests" ON public.subscription_requests
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = subscription_requests.business_id AND businesses.owner_id = auth.uid())
);

-- Business owners can insert requests for their own business
CREATE POLICY "Owners create requests" ON public.subscription_requests
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses WHERE businesses.id = subscription_requests.business_id AND businesses.owner_id = auth.uid())
);

-- Admins can view all requests
CREATE POLICY "Admins view all requests" ON public.subscription_requests
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins update requests" ON public.subscription_requests
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_subscription_requests_updated_at
  BEFORE UPDATE ON public.subscription_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
