
-- Enable pg_cron and pg_net for scheduled invoice generation
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add UPDATE policy for invoices so admins can mark as paid
-- (the ALL policy already covers this, but let's also allow owners to view)
-- Already have owner SELECT and admin ALL, so we're good.
