create table if not exists public.entre_admin_deletion_audit (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 target_id uuid not null,
 target_email text not null,
 reason text not null default '',
 deleted_at timestamptz not null default now()
);
alter table public.entre_admin_deletion_audit enable row level security;
revoke all on public.entre_admin_deletion_audit from public,anon,authenticated;
