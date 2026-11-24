begin;
create or replace function public.entre_relationships(_target uuid default null, _kind text default 'summary', _offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid(); target uuid:=coalesce(_target,me); result jsonb;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso negado' using errcode='42501'; end if;
 if not exists(select 1 from public.entre_profiles p where p.id=target) or exists(select 1 from public.entre_blocks b where (b.blocker=me and b.blocked=target) or (b.blocker=target and b.blocked=me)) or exists(select 1 from public.entre_moderation m where m.user_id=target and m.is_banned) then raise exception 'Perfil indisponível'; end if;
 if _kind='summary' then
 return jsonb_build_object('followers',(select count(*) from public.entre_follows where followed=target and status='accepted'),'following',(select count(*) from public.entre_follows where follower=target and status='accepted'),'outgoing',(select status from public.entre_follows where follower=me and followed=target),'incoming',(select status from public.entre_follows where follower=target and followed=me)); end if;
 if target<>me or _kind not in ('followers','following','pending_in','pending_out') then raise exception 'Acesso negado' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (
 select p.id,p.username,p.display_name,f.status from public.entre_follows f join public.entre_profiles p on p.id=case when f.follower=me then f.followed else f.follower end
 where ((f.followed=me and ((_kind='followers' and f.status='accepted') or (_kind='pending_in' and f.status='pending'))) or (f.follower=me and ((_kind='following' and f.status='accepted') or (_kind='pending_out' and f.status='pending'))))
 and not exists(select 1 from public.entre_blocks b where (b.blocker=me and b.blocked=p.id) or (b.blocked=me and b.blocker=p.id)) and not exists(select 1 from public.entre_moderation m where m.user_id=p.id and m.is_banned)
 order by f.updated_at desc,p.id limit 30 offset greatest(0,least(coalesce(_offset,0),10000))) x;
 return result;
end $$;
create or replace function public.entre_follow_remove(_target uuid,_direction text)
returns boolean language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() or _target is null or _target=me or _direction not in ('outgoing','incoming') then raise exception 'Acesso negado' using errcode='42501'; end if;
 update public.entre_follows set status='declined',updated_at=now() where status in ('pending','accepted') and ((_direction='outgoing' and follower=me and followed=_target) or (_direction='incoming' and followed=me and follower=_target));
 update public.entre_notifications set read_at=now() where user_id=me and actor_id=_target and kind='follow' and read_at is null;
 return true;
end $$;
create table if not exists public.entre_chat_read_cursor(user_id uuid not null references auth.users(id) on delete cascade,pair_id uuid not null references public.entre_pairs(id) on delete cascade,last_id bigint not null default 0,primary key(user_id,pair_id));
alter table public.entre_chat_read_cursor enable row level security;
revoke all on public.entre_chat_read_cursor from anon,authenticated,public;
create or replace function public.entre_chat_unread()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(x.pair_id,x.total),'{}'::jsonb) from (
 select p.id pair_id,count(m.id) total from public.entre_pairs p join public.entre_messages m on m.pair_id=p.id
 left join public.entre_chat_read_cursor r on r.user_id=auth.uid() and r.pair_id=p.id
 left join public.entre_conversation_prefs f on f.user_id=auth.uid() and f.pair_id=p.id
 where auth.uid() is not null and not public.entre_is_banned() and not public.entre_maintenance_active() and p.status='connected' and (p.a=auth.uid() or p.b=auth.uid()) and m.sender_id<>auth.uid() and m.id>greatest(coalesce(r.last_id,0),coalesce(f.cleared_through_id,0))
 group by p.id) x
$$;
create or replace function public.entre_chat_mark_read(_pair uuid,_last bigint)
returns void language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); last_seen bigint;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() or not exists(select 1 from public.entre_pairs p where p.id=_pair and p.status='connected' and (p.a=me or p.b=me)) then raise exception 'Acesso negado' using errcode='42501'; end if;
 select max(id) into last_seen from public.entre_messages where pair_id=_pair and id<=_last;
 if last_seen is null then return;end if;
 insert into public.entre_chat_read_cursor(user_id,pair_id,last_id) values(me,_pair,last_seen) on conflict(user_id,pair_id) do update set last_id=greatest(public.entre_chat_read_cursor.last_id,excluded.last_id);
end $$;
revoke all on function public.entre_relationships(uuid,text,integer),public.entre_follow_remove(uuid,text),public.entre_chat_unread(),public.entre_chat_mark_read(uuid,bigint) from public,anon;
grant execute on function public.entre_relationships(uuid,text,integer),public.entre_follow_remove(uuid,text),public.entre_chat_unread(),public.entre_chat_mark_read(uuid,bigint) to authenticated;
commit;;
