
DO $$
BEGIN
  PERFORM cron.unschedule('expire-reservations');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-reservations',
  '*/5 * * * *',
  $$ SELECT public.expire_reservations(); $$
);
