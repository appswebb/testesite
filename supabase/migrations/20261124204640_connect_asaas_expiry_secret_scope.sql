create or replace function public.connect_asaas_expiry_authorize(_token text) returns boolean
language sql security definer set search_path='' as $$
 select coalesce((select decrypted_secret=_token from vault.decrypted_secrets where name='connect_asaas_expiry_token' limit 1),false);
$$;
revoke all on function public.connect_asaas_expiry_authorize(text) from public,anon,authenticated;
grant execute on function public.connect_asaas_expiry_authorize(text) to service_role;
revoke select on vault.decrypted_secrets from service_role;
