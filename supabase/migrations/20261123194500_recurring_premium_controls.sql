create or replace function public.entre_premium_recurring_overview()
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare me uuid:=auth.uid();out jsonb;
begin
 if me is null then raise exception 'Faça login' using errcode='42501';end if;
 select jsonb_build_object('status',r.status,'created_at',r.created_at,'last_invoice_at',r.last_invoice_at,
 'can_cancel',r.status in ('pending','authorized','paused'))
 into out from public.entre_premium_recurring r where r.user_id=me
 order by r.created_at desc limit 1;
 return coalesce(out,'{}'::jsonb);
end $$;
revoke all on function public.entre_premium_recurring_overview() from public,anon;
grant execute on function public.entre_premium_recurring_overview() to authenticated;
create or replace function public.entre_admin_premium_recurring_settings()
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 return (select jsonb_build_object('recurring_enabled',recurring_enabled) from public.entre_premium_settings where id=1);
end $$;
revoke all on function public.entre_admin_premium_recurring_settings() from public,anon;
grant execute on function public.entre_admin_premium_recurring_settings() to authenticated;
create or replace function public.entre_admin_premium_recurring_toggle(_enabled boolean)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare flag boolean;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 if _enabled is null then raise exception 'Estado inválido';end if;
 update public.entre_premium_settings set recurring_enabled=_enabled,updated_at=now() where id=1 returning recurring_enabled into flag;
 return jsonb_build_object('recurring_enabled',flag);
end $$;
revoke all on function public.entre_admin_premium_recurring_toggle(boolean) from public,anon;
grant execute on function public.entre_admin_premium_recurring_toggle(boolean) to authenticated;