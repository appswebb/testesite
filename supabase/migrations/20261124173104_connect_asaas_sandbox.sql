begin;
create table public.connect_asaas_test_payments (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 amount_cents integer not null check(amount_cents between 100 and 1000000),
 method text not null check(method in ('PIX','CREDIT_CARD')),
 status text not null default 'creating',
 customer_id text, provider_id text unique,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.connect_asaas_test_payments enable row level security;
revoke all on public.connect_asaas_test_payments from public,anon,authenticated;
grant select,insert,update,delete on public.connect_asaas_test_payments to service_role;
create index connect_asaas_test_user_idx on public.connect_asaas_test_payments(user_id,created_at desc);
create unique index connect_asaas_test_open_idx on public.connect_asaas_test_payments(user_id) where status in ('creating','PENDING','AWAITING_RISK_ANALYSIS','AUTHORIZED','OVERDUE');
create table public.connect_asaas_test_events(id text primary key, provider_id text not null, event text not null, received_at timestamptz not null default now());
alter table public.connect_asaas_test_events enable row level security;
revoke all on public.connect_asaas_test_events from public,anon,authenticated;
grant select,insert,update,delete on public.connect_asaas_test_events to service_role;
commit;