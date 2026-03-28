-- Messages table for customer-business chat
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own booking messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings WHERE bookings.id = messages.booking_id AND bookings.customer_id = auth.uid()
  ));

CREATE POLICY "Business owners view booking messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings
    JOIN public.businesses ON businesses.id = bookings.business_id
    WHERE bookings.id = messages.booking_id AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Customers insert messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = messages.booking_id AND bookings.customer_id = auth.uid())
  );

CREATE POLICY "Business owners insert messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.bookings
      JOIN public.businesses ON businesses.id = bookings.business_id
      WHERE bookings.id = messages.booking_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners update messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings
    JOIN public.businesses ON businesses.id = bookings.business_id
    WHERE bookings.id = messages.booking_id AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Customers update messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings WHERE bookings.id = messages.booking_id AND bookings.customer_id = auth.uid()
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Review responses table
CREATE TABLE public.review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view responses" ON public.review_responses
  FOR SELECT USING (true);

CREATE POLICY "Business owners insert responses" ON public.review_responses
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses WHERE businesses.id = review_responses.business_id AND businesses.owner_id = auth.uid()
  ));

CREATE POLICY "Business owners update responses" ON public.review_responses
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses WHERE businesses.id = review_responses.business_id AND businesses.owner_id = auth.uid()
  ));