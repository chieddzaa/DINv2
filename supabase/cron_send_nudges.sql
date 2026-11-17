-- Runs the send-nudges function every minute.
-- Before running: replace YOUR-CRON-SECRET with the same value you saved as the
-- CRON_SECRET secret for the function. Safe to run again (it replaces the job).
select cron.unschedule('din-send-nudges') where exists (select 1 from cron.job where jobname = 'din-send-nudges');
select cron.schedule(
  'din-send-nudges',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://rcakhqznnqphhvxandmc.supabase.co/functions/v1/send-nudges',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR-CRON-SECRET'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
