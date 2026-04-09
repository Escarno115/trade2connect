
-- Delete in dependency order
DELETE FROM public.messages WHERE booking_id IN (
  SELECT id FROM public.bookings WHERE customer_id = '6ce73ea8-55d8-4de8-be63-b06abad1122d'
);

DELETE FROM public.review_responses WHERE business_id IN (
  SELECT id FROM public.businesses WHERE owner_id IN (
    '43799101-c6c7-4c90-86c0-bb0ca6f3c16d',
    '2511e94e-9c5e-49d5-aeab-8a671efb2950',
    'f867b597-1ba8-4412-8a4d-f9bb754313b5'
  )
);

DELETE FROM public.reviews WHERE customer_id = '6ce73ea8-55d8-4de8-be63-b06abad1122d';

DELETE FROM public.bookings WHERE customer_id = '6ce73ea8-55d8-4de8-be63-b06abad1122d';

DELETE FROM public.portfolio_images WHERE business_id IN (
  SELECT id FROM public.businesses WHERE owner_id IN (
    '43799101-c6c7-4c90-86c0-bb0ca6f3c16d',
    '2511e94e-9c5e-49d5-aeab-8a671efb2950',
    'f867b597-1ba8-4412-8a4d-f9bb754313b5'
  )
);

DELETE FROM public.verification_documents WHERE business_id IN (
  SELECT id FROM public.businesses WHERE owner_id IN (
    '43799101-c6c7-4c90-86c0-bb0ca6f3c16d',
    '2511e94e-9c5e-49d5-aeab-8a671efb2950',
    'f867b597-1ba8-4412-8a4d-f9bb754313b5'
  )
);

DELETE FROM public.invoices WHERE business_id IN (
  SELECT id FROM public.businesses WHERE owner_id IN (
    '43799101-c6c7-4c90-86c0-bb0ca6f3c16d',
    '2511e94e-9c5e-49d5-aeab-8a671efb2950',
    'f867b597-1ba8-4412-8a4d-f9bb754313b5'
  )
);

DELETE FROM public.subscription_requests WHERE business_id IN (
  SELECT id FROM public.businesses WHERE owner_id IN (
    '43799101-c6c7-4c90-86c0-bb0ca6f3c16d',
    '2511e94e-9c5e-49d5-aeab-8a671efb2950',
    'f867b597-1ba8-4412-8a4d-f9bb754313b5'
  )
);

DELETE FROM public.services WHERE business_id IN (
  SELECT id FROM public.businesses WHERE owner_id IN (
    '43799101-c6c7-4c90-86c0-bb0ca6f3c16d',
    '2511e94e-9c5e-49d5-aeab-8a671efb2950',
    'f867b597-1ba8-4412-8a4d-f9bb754313b5'
  )
);

DELETE FROM public.businesses WHERE owner_id IN (
  '43799101-c6c7-4c90-86c0-bb0ca6f3c16d',
  '2511e94e-9c5e-49d5-aeab-8a671efb2950',
  'f867b597-1ba8-4412-8a4d-f9bb754313b5'
);

DELETE FROM public.user_roles WHERE user_id IN (
  '43799101-c6c7-4c90-86c0-bb0ca6f3c16d',
  '2511e94e-9c5e-49d5-aeab-8a671efb2950',
  'f867b597-1ba8-4412-8a4d-f9bb754313b5',
  '6ce73ea8-55d8-4de8-be63-b06abad1122d'
);

DELETE FROM public.profiles WHERE id IN (
  '43799101-c6c7-4c90-86c0-bb0ca6f3c16d',
  '2511e94e-9c5e-49d5-aeab-8a671efb2950',
  'f867b597-1ba8-4412-8a4d-f9bb754313b5',
  '6ce73ea8-55d8-4de8-be63-b06abad1122d'
);

DELETE FROM auth.users WHERE id IN (
  '43799101-c6c7-4c90-86c0-bb0ca6f3c16d',
  '2511e94e-9c5e-49d5-aeab-8a671efb2950',
  'f867b597-1ba8-4412-8a4d-f9bb754313b5',
  '6ce73ea8-55d8-4de8-be63-b06abad1122d'
);
