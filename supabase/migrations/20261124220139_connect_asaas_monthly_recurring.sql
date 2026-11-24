create table public.connect_asaas_recurring(
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,amount_cents integer not null check(amount_cents between 100 and 1000000),
 checkout_id text unique,subscription_id text unique,customer_id text,status text not null default 'creating' check(status in ('creating','open','active','cancelled','expired','error')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index connect_asaas_recurring_open on public.connect_asaas_recurring(user_id) where status in ('creating','open','active');
create index connect_asaas_recurring_user on public.connect_asaas_recurring(user_id,created_at desc);
create table public.connect_asaas_recurring_charges(provider_id text primary key,recurring_id uuid not null references public.connect_asaas_recurring(id) on delete cascade,due_date date not null,status text not null,paid_until timestamptz,updated_at timestamptz not null default now());
alter table public.connect_asaas_recurring enable row level security;
alter table public.connect_asaas_recurring_charges enable row level security;
revoke all on public.connect_asaas_recurring,public.connect_asaas_recurring_charges from public,anon,authenticated;
grant select,insert,update on public.connect_asaas_recurring,public.connect_asaas_recurring_charges to service_role;
create function public.connect_asaas_recurring_reserve(_id uuid,_user uuid,_cents integer) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_user::text,913821));
 if not exists(select 1 from public.entre_premium_settings where id=1 and enabled and monthly_price_cents=_cents) or public.entre_premium_active(_user) then return false;end if;
 if exists(select 1 from public.connect_asaas_payments where user_id=_user and status not in ('CONFIRMED','RECEIVED','REFUNDED','REFUND_REQUESTED','REFUND_IN_PROGRESS','PARTIALLY_REFUNDED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL','DELETED','ERROR','RECEIVED_IN_CASH')) or exists(select 1 from public.entre_premium_web_payments where user_id=_user and status in ('creating','pending','in_process')) or exists(select 1 from public.entre_premium_recurring where user_id=_user and status in ('pending','authorized','paused')) then return false;end if;
 insert into public.connect_asaas_recurring(id,user_id,amount_cents) values(_id,_user,_cents) on conflict do nothing;return found;
end $$;
create or replace function public.connect_asaas_reserve(_id uuid,_user uuid,_cents integer,_method text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_user::text,913821));
 if not exists(select 1 from public.entre_premium_settings where id=1 and enabled and monthly_price_cents=_cents) or public.entre_premium_active(_user) then return false;end if;
 if exists(select 1 from public.entre_premium_web_payments where user_id=_user and status in ('creating','pending','in_process')) or exists(select 1 from public.connect_asaas_recurring where user_id=_user and status in ('creating','open','active')) then return false;end if;
 insert into public.connect_asaas_payments(id,user_id,amount_cents,method) values(_id,_user,_cents,_method) on conflict do nothing;return found;
end $$;
create function public.connect_asaas_recurring_sync(_id uuid,_checkout text,_subscription text,_customer text,_payment text,_cents integer,_due date,_status text) returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.connect_asaas_recurring%rowtype; expiry timestamptz; current_expiry timestamptz;
begin
 select * into r from public.connect_asaas_recurring where id=_id for update;
 if not found or r.checkout_id is null or r.amount_cents<>_cents or _subscription !~ '^sub_[A-Za-z0-9_]+$' or _customer !~ '^cus_[A-Za-z0-9_]+$' or _payment !~ '^pay_[A-Za-z0-9_]+$' or _due is null or (r.subscription_id is null and r.checkout_id is distinct from _checkout) or (r.subscription_id is not null and r.subscription_id<>_subscription) or (r.customer_id is not null and r.customer_id<>_customer) then raise exception 'identity mismatch';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(r.user_id::text,913821));
 update public.connect_asaas_recurring set subscription_id=_subscription,customer_id=_customer,status=case when status='cancelled' then status else 'active' end,updated_at=now() where id=r.id;
 if _status in ('CONFIRMED','RECEIVED') then expiry:=((_due+interval '1 month')::timestamp at time zone 'America/Sao_Paulo');end if;
 insert into public.connect_asaas_recurring_charges(provider_id,recurring_id,due_date,status,paid_until) values(_payment,r.id,_due,_status,expiry)
 on conflict(provider_id) do update set status=excluded.status,paid_until=excluded.paid_until,updated_at=now() where public.connect_asaas_recurring_charges.recurring_id=r.id and public.connect_asaas_recurring_charges.due_date=_due;
 if not found then raise exception 'charge identity mismatch';end if;
 select max(c.paid_until) into current_expiry from public.connect_asaas_recurring_charges c where c.recurring_id=r.id and c.status in ('CONFIRMED','RECEIVED');
 if current_expiry>now() then
 insert into public.entre_premium_subscriptions(user_id,provider,provider_id,status,paid_until,updated_at) values(r.user_id,'asaas',_subscription,'authorized',current_expiry,now())
 on conflict(user_id) do update set provider='asaas',provider_id=_subscription,status='authorized',paid_until=excluded.paid_until,updated_at=now() where public.entre_premium_subscriptions.provider_id=_subscription or public.entre_premium_subscriptions.paid_until is null or public.entre_premium_subscriptions.paid_until<=excluded.paid_until;
 else
 update public.entre_premium_subscriptions set status='cancelled',paid_until=current_expiry,updated_at=now() where user_id=r.user_id and provider='asaas' and provider_id=_subscription;
 end if;return true;
end $$;
create function public.connect_asaas_recurring_overview() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('status',r.status,'can_cancel',r.status in ('open','active'),'amount_cents',r.amount_cents) from public.connect_asaas_recurring r where r.user_id=auth.uid() order by r.created_at desc limit 1),'{}'::jsonb)
$$;
revoke all on function public.connect_asaas_recurring_reserve(uuid,uuid,integer),public.connect_asaas_recurring_sync(uuid,text,text,text,text,integer,date,text) from public,anon,authenticated;
grant execute on function public.connect_asaas_recurring_reserve(uuid,uuid,integer),public.connect_asaas_recurring_sync(uuid,text,text,text,text,integer,date,text) to service_role;
revoke all on function public.connect_asaas_recurring_overview() from public,anon;
grant execute on function public.connect_asaas_recurring_overview() to authenticated;
create function public.connect_asaas_recurring_delete_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.connect_asaas_recurring where user_id=old.id and status in ('creating','open','active')) then raise exception 'Cancele a assinatura mensal ou a tentativa de contratação antes de excluir a conta.';end if;
 return old;
end $$;
revoke all on function public.connect_asaas_recurring_delete_guard() from public,anon,authenticated;
create trigger connect_asaas_recurring_profile_guard before delete on public.entre_profiles for each row execute function public.connect_asaas_recurring_delete_guard();
create trigger connect_asaas_recurring_auth_guard before delete on auth.users for each row execute function public.connect_asaas_recurring_delete_guard();
