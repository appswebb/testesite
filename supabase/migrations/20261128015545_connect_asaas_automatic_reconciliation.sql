select cron.schedule('connect-asaas-automatic-reconciliation','*/5 * * * *',$job$
select net.http_post(
 url := 'https://trrakyybnvxpdhxwgjrz.supabase.co/functions/v1/connect-asaas-expire',
 headers := jsonb_build_object('Content-Type','application/json','x-connect-expire-token',(select decrypted_secret from vault.decrypted_secrets where name='connect_asaas_expiry_token' limit 1)),
 body := '{}'::jsonb,
 timeout_milliseconds := 120000
) where exists (select 1 from vault.decrypted_secrets where name='connect_asaas_expiry_token' and length(decrypted_secret)=64);
$job$);