-- Retire the legacy personal WhatsApp contact; preserve administrator authentication.
create or replace function public.entre_premium_whatsapp()
returns text language plpgsql stable security invoker set search_path to '' as $$
begin
 if auth.uid() is null then raise exception 'Faça login' using errcode='42501';end if;
 return 'mailto:connectapp.w@gmail.com';
end $$;
revoke all on function public.entre_premium_whatsapp() from public,anon;
grant execute on function public.entre_premium_whatsapp() to authenticated;
