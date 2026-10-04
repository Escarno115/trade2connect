CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('fraud','bad_behaviour','fake_request','no_show','harassment','other')),
  details text NOT NULL CHECK (char_length(details) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  admin_note text CHECK (admin_note IS NULL OR char_length(admin_note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reported_business_id IS NOT NULL OR reported_user_id IS NOT NULL),
  CHECK (reported_user_id IS NULL OR reported_user_id <> reporter_id)
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users file reports" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'open' AND admin_note IS NULL
    AND (reported_business_id IS NULL OR NOT public.owns_business(reported_business_id, auth.uid())));
CREATE POLICY "Users view own reports" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX reports_status_idx ON public.reports(status, created_at DESC);
CREATE TRIGGER update_reports_ts BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();