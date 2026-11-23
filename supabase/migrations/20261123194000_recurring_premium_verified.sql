-- Separate verified recurring-card subscriptions from 30-day prepaid Pix/card purchases.
alter table public.entre_premium_settings add column if not exists recurring_enabled boolean not null default false;
create table if not exists public.entre_premium_recurring (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 preapproval_id text unique,
 amount_cents integer not null check(amount_cents>0),
 status text not null default 'creating' check(status in ('creating','pending','authorized','paused','cancelled','error')),
 last_invoice_id text,
 last_invoice_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists entre_premium_recurring_one_current on public.entre_premium_recurring(user_id)
where status in ('creating','pending','authorized','paused');
alter table public.entre_premium_recurring enable row level security;
revoke all on public.entre_premium_recurring from public,anon,authenticated;

-- Only service_role may record a proven approved invoice; never client-side.
create or replace function public.entre_premium_recurring_apply(_preapproval text,_invoice text,_debit timestamptz,_amount_cents integer)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare r public.entre_premium_recurring%rowtype; paid timestamptz; last_until timestamptz;
begin
 select * into r from public.entre_premium_recurring
 where preapproval_id=_preapproval for update;
 if r.id is null or r.status not in ('creating','pending','authorized') or r.amount_cents<>_amount_cents or
  _invoice is null or length(_invoice)<1 or length(_invoice)>100 or _debit is null or _debit>now()+interval '5 minutes'
 then return false;end if;
 if r.last_invoice_id=_invoice then return true;end if;
 if r.last_invoice_at is not null and _debit<=r.last_invoice_at then return false;end if;
 if _debit<now()-interval '35 days' then return false;end if;
 paid:=_debit+interval '1 month';
 if paid<=now() then return false;end if;
 select paid_until into last_until from public.entre_premium_subscriptions where user_id=r.user_id;
 insert into public.entre_premium_subscriptions(user_id,provider,provider_id,status,paid_until,updated_at)
 values(r.user_id,'mercadopago_recurring',r.preapproval_id,'authorized',greatest(paid,coalesce(last_until,paid)),now())
 on conflict(user_id) do update set provider='mercadopago_recurring',
 provider_id=excluded.provider_id,status='authorized',paid_until=greatest(public.entre_premium_subscriptions.paid_until,excluded.paid_until),updated_at=now();
 update public.entre_premium_recurring set status='authorized',last_invoice_id=_invoice,last_invoice_at=_debit,updated_at=now() where id=r.id;
 return true;
end $$;
revoke all on function public.entre_premium_recurring_apply(text,text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.entre_premium_recurring_apply(text,text,timestamptz,integer) to service_role;
