begin;
create table public.entre_voice_activity(pair_id uuid not null references public.entre_pairs(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,expires_at timestamptz not null,primary key(pair_id,user_id));
alter table public.entre_voice_activity enable row level security;
revoke all on public.entre_voice_activity from public,anon,authenticated;
grant select on public.entre_voice_activity to authenticated;
create policy voice_activity_participants on public.entre_voice_activity for select to authenticated using (not (select public.entre_is_banned()) and not (select public.entre_maintenance_active()) and exists(select 1 from public.entre_pairs p where p.id=pair_id and (p.a=(select auth.uid()) or p.b=(select auth.uid())) and (p.status='connected' or (p.status='active' and p.expires_at>now())) and not exists(select 1 from public.entre_blocks b where (b.blocker=p.a and b.blocked=p.b) or (b.blocker=p.b and b.blocked=p.a))));
create function public.entre_voice_recording(_pair uuid,_active boolean) returns void language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
if me is null or public.entre_is_banned() or public.entre_maintenance_active() or not exists(select 1 from public.entre_pairs p where p.id=_pair and (p.a=me or p.b=me) and (p.status='connected' or (p.status='active' and p.expires_at>now())) and not exists(select 1 from public.entre_blocks b where (b.blocker=p.a and b.blocked=p.b) or (b.blocker=p.b and b.blocked=p.a))) then raise exception 'Acesso negado' using errcode='42501';end if;
insert into public.entre_voice_activity(pair_id,user_id,expires_at) values(_pair,me,case when _active then now()+interval '12 seconds' else now() end) on conflict(pair_id,user_id) do update set expires_at=excluded.expires_at;
end $$;
revoke all on function public.entre_voice_recording(uuid,boolean) from public,anon;
grant execute on function public.entre_voice_recording(uuid,boolean) to authenticated;
alter publication supabase_realtime add table public.entre_voice_activity;
commit;