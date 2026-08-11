create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- The service_role key used to authenticate this call is stored in
-- Supabase Vault under the name 'service_role_key' — set once directly
-- via `supabase db query`, never committed to this repo.
select cron.schedule(
  'evening-nudge',
  '30 11 * * *', -- 17:00 IST = 11:30 UTC, OPD closure time
  $$
  select net.http_post(
    url := 'https://fgrncxdifszqqekkhjzm.supabase.co/functions/v1/send-evening-nudge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    )
  );
  $$
);
