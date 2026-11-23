-- Camera live broadcasts. Host and one approved co-host may publish; everyone else is read-only.
create table if not exists public.entre_lives (
 id uuid primary key default gen_random_uuid(),
 host_id uuid not null references auth.users(id) on delete cascade,
 guest_id uuid references auth.users(id) on delete set null,
 guest_requested_by uuid references auth.users(id) on delete set null,
 title text not null check(char_length(title) between 3 and 90),
 status text not null default 'active' check(status in ('active','ended')),
 started_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '2 hours',
 ended_at timestamptz,
 constraint entre_lives_guest_not_host check(guest_id is null or guest_id<>host_id)
);
create unique index if not exists entre_lives_one_per_host on public.entre_lives(host_id) where status='active';
create index if not exists entre_lives_recent on public.entre_lives(started_at desc) where status='active';
alter table public.entre_lives enable row level security;
revoke all on public.entre_lives from public,anon,authenticated;

create or replace function public.entre_lives_list()
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); response jsonb;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Faça login para acessar lives' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.started_at desc),'[]'::jsonb) into response
 from (
  select l.id,l.title,l.host_id,l.guest_id,l.guest_requested_by,l.started_at,
  coalesce(h.display_name,'Pessoa') host_name,h.username host_username,
  coalesce(g.display_name,'') guest_name,
  l.host_id=me as is_host,l.guest_id=me as is_guest,l.guest_requested_by=me as requested
  from public.entre_lives l
  join public.entre_profiles h on h.id=l.host_id
  left join public.entre_profiles g on g.id=l.guest_id
  where l.status='active' and l.expires_at>now()
  and not exists(select 1 from public.entre_moderation m where m.user_id=l.host_id and m.is_banned)
  and not exists(select 1 from public.entre_blocks b where
    (b.blocker=me and b.blocked=l.host_id) or (b.blocker=l.host_id and b.blocked=me))
  order by l.started_at desc limit 30
 ) x;
 return response;
end $$;
revoke all on function public.entre_lives_list() from public,anon;
grant execute on function public.entre_lives_list() to authenticated;

create or replace function public.entre_live_start(_title text)
returns uuid language plpgsql security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); id uuid;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Live indisponível' using errcode='42501';end if;
 _title:=btrim(coalesce(_title,''));
 if length(_title)<3 or length(_title)>90 then raise exception 'Escreva um título entre 3 e 90 caracteres';end if;
 if exists(select 1 from public.entre_lives where host_id=me and status='active' and expires_at>now())
 then raise exception 'Encerre sua live atual antes de começar outra';end if;
 if (select count(*) from public.entre_lives where host_id=me and started_at>now()-interval '1 day') >= 10
 then raise exception 'Limite de 10 lives por dia';end if;
 update public.entre_lives set status='ended',ended_at=now() where host_id=me and status='active' and expires_at<=now();
 insert into public.entre_lives(host_id,title) values(me,_title) returning entre_lives.id into id;
 return id;
end $$;
revoke all on function public.entre_live_start(text) from public,anon;
grant execute on function public.entre_live_start(text) to authenticated;

create or replace function public.entre_live_request_guest(_live uuid)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); live public.entre_lives%rowtype;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Indisponível' using errcode='42501';end if;
 select * into live from public.entre_lives where id=_live for update;
 if live.id is null or live.status<>'active' or live.expires_at<=now() or live.host_id=me or live.guest_id is not null then
  raise exception 'Não é possível entrar como convidado'; end if;
 if exists(select 1 from public.entre_blocks b where (b.blocker=me and b.blocked=live.host_id) or (b.blocker=live.host_id and b.blocked=me)) then
  raise exception 'Pedido indisponível' using errcode='42501';end if;
 if live.guest_requested_by is not null and live.guest_requested_by<>me and live.started_at>now()-interval '2 hours' then
  raise exception 'Há outro pedido aguardando avaliação';end if;
 update public.entre_lives set guest_requested_by=me where id=_live;
 return true;
end $$;
revoke all on function public.entre_live_request_guest(uuid) from public,anon;
grant execute on function public.entre_live_request_guest(uuid) to authenticated;

create or replace function public.entre_live_review_guest(_live uuid,_approve boolean)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); live public.entre_lives%rowtype;
begin
 if me is null then raise exception 'Faça login' using errcode='42501';end if;
 select * into live from public.entre_lives where id=_live for update;
 if live.id is null or live.host_id<>me or live.status<>'active' or live.expires_at<=now() or live.guest_requested_by is null
 then raise exception 'Este pedido não existe ou não pertence à sua live' using errcode='42501';end if;
 if _approve and exists(select 1 from public.entre_moderation m where m.user_id=live.guest_requested_by and m.is_banned) then
  raise exception 'Conta suspensa';end if;
 update public.entre_lives set guest_id=case when _approve then live.guest_requested_by else guest_id end,
 guest_requested_by=null where id=_live;
 return true;
end $$;
revoke all on function public.entre_live_review_guest(uuid,boolean) from public,anon;
grant execute on function public.entre_live_review_guest(uuid,boolean) to authenticated;

create or replace function public.entre_live_exit(_live uuid)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); row_count integer;
begin
 if me is null then raise exception 'Faça login' using errcode='42501';end if;
 update public.entre_lives set
 status=case when host_id=me then 'ended' else status end,
 ended_at=case when host_id=me then now() else ended_at end,
 guest_id=case when guest_id=me then null else guest_id end,
 guest_requested_by=case when guest_requested_by=me then null else guest_requested_by end
 where id=_live and status='active' and (host_id=me or guest_id=me or guest_requested_by=me);
 get diagnostics row_count=row_count;return row_count>0;
end $$;
revoke all on function public.entre_live_exit(uuid) from public,anon;
grant execute on function public.entre_live_exit(uuid) to authenticated;

create or replace function public.entre_live_expire()
returns void language plpgsql security definer set search_path to ''
as $$
begin
 update public.entre_lives set status='ended',ended_at=now()
 where status='active' and expires_at<=now();
 delete from public.entre_lives where status='ended' and coalesce(ended_at,started_at)<now()-interval '7 days';
end $$;
revoke all on function public.entre_live_expire() from public,anon,authenticated;
do $$
begin
 if exists(select 1 from cron.job where jobname='entre-expire-live-rooms') then
   perform cron.unschedule('entre-expire-live-rooms');
 end if;
 perform cron.schedule('entre-expire-live-rooms','* * * * *','select public.entre_live_expire();');
end $$;
