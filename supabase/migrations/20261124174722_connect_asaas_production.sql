begin;
alter table public.entre_premium_subscriptions drop constraint entre_premium_subscriptions_provider_check;
alter table public.entre_premium_subscriptions add constraint entre_premium_subscriptions_provider_check check(provider in ('mercadopago','mercadopago_web','asaas'));
create table public.connect_asaas_payments (
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 amount_cents integer not null check(amount_cents between 100 and 1000000),method text not null check(method in ('PIX','CREDIT_CARD')),
 status text not null default 'creating',customer_id text,provider_id text unique,
 granted_at timestamptz,paid_until timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.connect_asaas_payments enable row level security;
revoke all on public.connect_asaas_payments from public,anon,authenticated;
grant select,insert,update on public.connect_asaas_payments to service_role;
create index connect_asaas_user_idx on public.connect_asaas_payments(user_id,created_at desc);
create unique index connect_asaas_open_idx on public.connect_asaas_payments(user_id) where status not in ('CONFIRMED','RECEIVED','REFUNDED','REFUND_REQUESTED','REFUND_IN_PROGRESS','PARTIALLY_REFUNDED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL','DELETED','ERROR','RECEIVED_IN_CASH');
create table public.connect_asaas_events(id text primary key,provider_id text not null,event text not null,received_at timestamptz not null default now());
alter table public.connect_asaas_events enable row level security;
revoke all on public.connect_asaas_events from public,anon,authenticated;
grant select,insert on public.connect_asaas_events to service_role;
create function public.connect_asaas_reserve(_id uuid,_user uuid,_cents integer,_method text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_user::text,913821));
 if not exists(select 1 from public.entre_premium_settings where id=1 and enabled and monthly_price_cents=_cents) or public.entre_premium_active(_user) then return false;end if;
 if exists(select 1 from public.entre_premium_web_payments where user_id=_user and status in ('creating','pending','in_process')) then return false;end if;
 insert into public.connect_asaas_payments(id,user_id,amount_cents,method) values(_id,_user,_cents,_method) on conflict do nothing;return found;
end $$;
revoke all on function public.connect_asaas_reserve(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.connect_asaas_reserve(uuid,uuid,integer,text) to service_role;
create function public.connect_asaas_sync(_id uuid,_provider text,_customer text,_amount integer,_method text,_status text) returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.connect_asaas_payments%rowtype; expiry timestamptz;
begin
 select * into r from public.connect_asaas_payments where id=_id for update;
 if not found or r.customer_id is distinct from _customer or r.amount_cents<>_amount or r.method<>_method or (r.provider_id is not null and r.provider_id<>_provider) or _provider !~ '^pay_[A-Za-z0-9_]+$' then raise exception 'identity mismatch';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(r.user_id::text,913821));
 if _status in ('CONFIRMED','RECEIVED') then
  if r.granted_at is null then
   expiry:=now()+interval '30 days';
   update public.connect_asaas_payments set granted_at=now(),paid_until=expiry where id=r.id;
  else expiry:=r.paid_until;end if;
  if expiry>now() then
   insert into public.entre_premium_subscriptions(user_id,provider,provider_id,status,paid_until,updated_at) values(r.user_id,'asaas',_provider,'authorized',expiry,now())
   on conflict(user_id) do update set provider='asaas',provider_id=_provider,status='authorized',paid_until=excluded.paid_until,updated_at=now()
   where public.entre_premium_subscriptions.paid_until is null or public.entre_premium_subscriptions.paid_until<=excluded.paid_until or public.entre_premium_subscriptions.provider_id=_provider;
  end if;
 elsif _status in ('REFUNDED','REFUND_REQUESTED','REFUND_IN_PROGRESS','PARTIALLY_REFUNDED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL','DELETED') then
  update public.entre_premium_subscriptions set status='cancelled',updated_at=now() where user_id=r.user_id and provider='asaas' and provider_id=_provider;
 end if;
 update public.connect_asaas_payments set status=_status,provider_id=_provider,updated_at=now() where id=r.id;
 return true;
end $$;
revoke all on function public.connect_asaas_sync(uuid,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.connect_asaas_sync(uuid,text,text,integer,text,text) to service_role;
commit;