alter table public.entre_premium_settings add column asaas_recurring_enabled boolean not null default false;
create or replace function public.connect_asaas_recurring_overview() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('available',coalesce((select enabled and asaas_recurring_enabled from public.entre_premium_settings where id=1),false)) || coalesce((select jsonb_build_object('status',r.status,'can_cancel',r.status in ('open','active'),'amount_cents',r.amount_cents) from public.connect_asaas_recurring r where r.user_id=auth.uid() order by r.created_at desc limit 1),'{}'::jsonb)
$$;
create or replace function public.connect_asaas_recurring_reserve(_id uuid,_user uuid,_cents integer) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_user::text,913821));
 if not exists(select 1 from public.entre_premium_settings where id=1 and enabled and asaas_recurring_enabled and monthly_price_cents=_cents) or public.entre_premium_active(_user) then return false;end if;
 if exists(select 1 from public.connect_asaas_payments where user_id=_user and status not in ('CONFIRMED','RECEIVED','REFUNDED','REFUND_REQUESTED','REFUND_IN_PROGRESS','PARTIALLY_REFUNDED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL','DELETED','ERROR','RECEIVED_IN_CASH')) or exists(select 1 from public.entre_premium_web_payments where user_id=_user and status in ('creating','pending','in_process')) or exists(select 1 from public.entre_premium_recurring where user_id=_user and status in ('pending','authorized','paused')) then return false;end if;
 insert into public.connect_asaas_recurring(id,user_id,amount_cents) values(_id,_user,_cents) on conflict do nothing;return found;
end $$;
