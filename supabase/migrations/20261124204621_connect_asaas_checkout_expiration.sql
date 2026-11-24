-- Schedule expiry of unpaid Asaas checkout attempts; never expire a confirmed payment.
do $$
begin
 if not exists(select 1 from vault.secrets where name='connect_asaas_expiry_token') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'connect_asaas_expiry_token','Internal Asaas checkout expiry worker authentication');
 end if;
end $$;
create or replace function public.connect_asaas_expiry_authorize(_token text) returns boolean
language sql security invoker set search_path='' as $$
 select coalesce((select decrypted_secret=_token from vault.decrypted_secrets where name='connect_asaas_expiry_token' limit 1),false);
$$;
revoke all on function public.connect_asaas_expiry_authorize(text) from public,anon,authenticated;
grant execute on function public.connect_asaas_expiry_authorize(text) to service_role;
grant select on vault.decrypted_secrets to service_role;
select cron.schedule('connect-asaas-expire-30minutes','* * * * *',$job$
 select net.http_post(
  url:='https://trrakyybnvxpdhxwgjrz.supabase.co/functions/v1/connect-asaas-expire',
  headers:=jsonb_build_object('Content-Type','application/json','x-connect-expire-token',(select decrypted_secret from vault.decrypted_secrets where name='connect_asaas_expiry_token' limit 1)),
  body:='{}'::jsonb,timeout_milliseconds:=55000
 ) where exists(select 1 from public.connect_asaas_payments where status in ('creating','PENDING','OVERDUE') and created_at<=now()-interval '30 minutes');
$job$);
