-- One-time web payments for a 30-day Premium period (Pix or credit card).
-- This is NOT a recurring Pix mandate. Renew after expiry.
create table if not exists public.entre_premium_web_payments (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 amount_cents integer not null check(amount_cents>=100 and amount_cents<=1000000),
 method text not null check(method in ('pix','card')),
 status text not null default 'creating' check(status in ('creating','pending','in_process','approved','rejected','cancelled','error')),
 provider_payment_id text unique,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 paid_until timestamptz
);
create index if not exists entre_premium_web_user_created_idx on public.entre_premium_web_payments(user_id,created_at desc);
alter table public.entre_premium_web_payments enable row level security;
revoke all on public.entre_premium_web_payments from public,anon,authenticated;
