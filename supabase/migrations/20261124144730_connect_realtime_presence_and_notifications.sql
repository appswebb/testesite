begin;
CREATE OR REPLACE FUNCTION public.entre_avatar_visible_for(_owner_text text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare viewer uuid:=(select auth.uid()); owner uuid;
begin
 if viewer is null or public.entre_is_banned() or public.entre_maintenance_active() then return false;end if;
 if _owner_text is null or _owner_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false;end if;
 owner:=_owner_text::uuid;
 if owner=viewer then return true;end if;
 if exists(select 1 from public.entre_moderation m where m.user_id=owner and m.is_banned) then return false;end if;
 if exists(select 1 from public.entre_blocks b
  where (b.blocker=viewer and b.blocked=owner) or (b.blocker=owner and b.blocked=viewer))
 then return false;end if;
 return
  exists(select 1 from public.entre_pairs p
   where ((p.a=viewer and p.b=owner) or (p.b=viewer and p.a=owner))
    and (p.status='connected' or (p.status='active' and p.expires_at>now())))
  or exists(select 1 from public.entre_presence p
   where p.user_id=owner and p.visible and p.last_seen>now()-interval '5 minutes')
  or exists(select 1 from public.entre_posts p where p.author_id=owner);
end;$function$
;
CREATE OR REPLACE FUNCTION public.entre_chat_request(_target uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); approved boolean; opened uuid; existing_id bigint; n integer;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Conta indisponível';end if;
 if _target is null or _target=uid then raise exception 'Pessoa inválida';end if;
 if exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=_target) or (b.blocker=_target and b.blocked=uid))
 then return jsonb_build_object('status','blocked','message','Esta pessoa não recebe solicitações de conversa.');end if;
 if exists(select 1 from public.entre_moderation m where m.user_id=_target and m.is_banned) then return jsonb_build_object('status','unavailable');end if;
 select exists(select 1 from public.entre_follows f where status='accepted' and
 ((f.follower=uid and f.followed=_target) or(f.follower=_target and f.followed=uid))) into approved;
 if approved then
  opened:=public.entre_social_open_pair(uid,_target);
  return jsonb_build_object('status','open','pair_id',opened);
 end if;
 if not exists(select 1 from public.entre_presence pr where pr.user_id=_target and pr.visible and pr.allow_requests and pr.last_seen>now()-interval '5 minutes')
 then return jsonb_build_object('status','blocked','message','Esta pessoa não aceita solicitações de conversa de desconhecidos. Você pode enviar uma solicitação para seguir e aguardar o aceite.');end if;
 select id into existing_id from public.entre_chat_requests where sender=uid and receiver=_target and status='pending';
 if existing_id is not null then return jsonb_build_object('status','pending','request_id',existing_id);end if;
 select count(*) into n from public.entre_chat_requests where sender=uid and updated_at>now()-interval '24 hours';
 if n>=15 then raise exception 'Limite diário de solicitações alcançado';end if;
 insert into public.entre_chat_requests(sender,receiver,status) values(uid,_target,'pending')
 on conflict(sender,receiver) do update set status='pending',updated_at=now()
 returning id into existing_id;
 insert into public.entre_notifications(user_id,actor_id,kind) values(_target,uid,'chat_request');
 return jsonb_build_object('status','pending','request_id',existing_id);
end $function$
;
CREATE OR REPLACE FUNCTION public.entre_online_page(_offset integer DEFAULT 0, _limit integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); listed jsonb; has_more boolean;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível';end if;
 if _offset is null or _offset<0 or _offset>240 or _limit is distinct from 12 then raise exception 'Limite inválido';end if;
 with ranked as(
  select ep.user_id as id,pr.display_name,pr.username,pr.age,pr.gender,left(pr.bio,220) bio,
    pr.avatar_path,pr.avatar_uploaded_at,ep.last_seen,ep.allow_requests,
    (select f.status from public.entre_follows f where f.follower=uid and f.followed=ep.user_id) as follow_status,
    (select f.status from public.entre_follows f where f.followed=uid and f.follower=ep.user_id) as follower_status,
    row_number() over(order by ep.last_seen desc,ep.user_id desc) as rn
  from public.entre_presence ep join public.entre_profiles pr on pr.id=ep.user_id
  where ep.visible and ep.last_seen>now()-interval '5 minutes'
   and ep.user_id<>uid
   and not exists(select 1 from public.entre_moderation x where x.user_id=ep.user_id and x.is_banned)
   and not exists(select 1 from public.entre_blocks x where
     (x.blocker=uid and x.blocked=ep.user_id) or (x.blocked=uid and x.blocker=ep.user_id))
  order by ep.last_seen desc,ep.user_id desc limit _limit+1 offset _offset
 )
 select coalesce(jsonb_agg(to_jsonb(r)-'rn' order by r.rn) filter(where r.rn<=_offset+_limit),'[]'::jsonb),
 coalesce(bool_or(r.rn>_offset+_limit),false)
 into listed,has_more from ranked r;
 return jsonb_build_object('rows',listed,'has_more',has_more,'offset',_offset,'limit',_limit);
end $function$
;
CREATE OR REPLACE FUNCTION public.entre_user_search(_query text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); term text:=lower(btrim(regexp_replace(coalesce(_query,''),'^@',''))); results jsonb;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active()
 then raise exception 'Busca indisponível' using errcode='42501'; end if;
 if length(term)<2 or length(term)>40 then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(to_jsonb(row_item) order by row_item.rank, row_item.username),'[]'::jsonb)
 into results
 from (
   select p.id,p.username,p.display_name,p.age,p.gender,left(p.bio,220) bio,
      p.avatar_path,p.avatar_uploaded_at,
      coalesce(ep.visible and ep.last_seen>now()-interval '5 minutes',false) as is_online,
      coalesce(ep.visible and ep.allow_requests and ep.last_seen>now()-interval '5 minutes',false) as allow_requests,
      (select f.status from public.entre_follows f where f.follower=uid and f.followed=p.id) as follow_status,
      (select f.status from public.entre_follows f where f.followed=uid and f.follower=p.id) as follower_status,
      case when p.username=term then 0 when left(p.username,length(term))=term then 1
           when strpos(p.username,term)>0 then 2 else 3 end as rank
   from public.entre_profiles p
   left join public.entre_presence ep on ep.user_id=p.id
   where p.id<>uid
     and (strpos(p.username,term)>0 or strpos(lower(p.display_name),term)>0)
     and not exists(select 1 from public.entre_moderation m where m.user_id=p.id and m.is_banned)
     and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=p.id)
         or (b.blocked=uid and b.blocker=p.id))
   order by rank,p.username
   limit 12
 ) row_item;
 return results;
end; $function$
;
create table if not exists public.entre_presence_signal(id smallint primary key check(id=1),revision bigint not null default 0);
insert into public.entre_presence_signal(id) values(1) on conflict do nothing;
alter table public.entre_presence_signal enable row level security;
revoke all on public.entre_presence_signal from public,anon,authenticated;
grant select on public.entre_presence_signal to anon,authenticated;
create policy entre_presence_signal_read on public.entre_presence_signal for select to anon,authenticated using (id=1);
create or replace function public.entre_online_count() returns bigint language sql stable security definer set search_path='' as $$
select count(*) from public.entre_presence p join public.entre_profiles pr on pr.id=p.user_id
where p.visible and p.last_seen>now()-interval '5 minutes'
and not exists(select 1 from public.entre_moderation m where m.user_id=p.user_id and m.is_banned)
$$;
revoke all on function public.entre_online_count() from public;
grant execute on function public.entre_online_count() to anon,authenticated;
create or replace function public.entre_signal_presence_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  if not new.visible then return new;end if;
 elsif TG_OP='DELETE' then
  if not old.visible then return old;end if;
 elsif not (old.visible is distinct from new.visible or (new.visible and (old.allow_requests is distinct from new.allow_requests or (old.last_seen>now()-interval '5 minutes') is distinct from (new.last_seen>now()-interval '5 minutes')))) then return new;
 end if;
 update public.entre_presence_signal set revision=revision+1 where id=1;
 if TG_OP='DELETE' then return old;end if;
 return new;
end $$;
revoke all on function public.entre_signal_presence_change() from public,anon,authenticated;
drop trigger if exists entre_signal_presence_change on public.entre_presence;
create trigger entre_signal_presence_change after insert or update or delete on public.entre_presence for each row execute function public.entre_signal_presence_change();
create or replace function public.entre_online_depart() returns void language plpgsql security definer set search_path='' as $$
begin if auth.uid() is null then raise exception 'Acesso negado' using errcode='42501';end if;
update public.entre_presence set last_seen=now()-interval '6 minutes' where user_id=auth.uid(); end $$;
revoke all on function public.entre_online_depart() from public,anon;
grant execute on function public.entre_online_depart() to authenticated;
alter table public.entre_notifications enable row level security;
grant select on public.entre_notifications to authenticated;
create policy entre_notifications_owner_realtime on public.entre_notifications for select to authenticated using (user_id=(select auth.uid()) and not (select public.entre_is_banned()));
alter publication supabase_realtime add table public.entre_presence_signal,public.entre_notifications;
commit;