CREATE OR REPLACE FUNCTION public.entre_follow_respond(_follower uuid, _accept boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); pid uuid;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Conta indisponível';end if;
 if _accept is null then raise exception 'Resposta inválida';end if;
 if not exists(select 1 from public.entre_follows
 where follower=_follower and followed=uid and status='pending' for update) then raise exception 'Solicitação inexistente';end if;
 if exists(select 1 from public.entre_blocks x where
 (x.blocker=uid and x.blocked=_follower) or(x.blocker=_follower and x.blocked=uid)) then raise exception 'Solicitação bloqueada';end if;
 update public.entre_follows set status=case when _accept then 'accepted' else 'declined' end,updated_at=now()
 where follower=_follower and followed=uid and status='pending';
 if _accept then
  insert into public.entre_notifications(user_id,actor_id,kind)
  values(_follower,uid,'follow_accepted');
 end if;
 return jsonb_build_object('status',case when _accept then 'accepted' else 'declined' end,'pair_id',pid);
end $function$;
create or replace function public.entre_chat_request(_target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); opened uuid; existing_id bigint; known boolean; n integer; last_status text; last_change timestamptz;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Conta indisponível';end if;
 if _target is null or _target=uid then raise exception 'Pessoa inválida';end if;
 if not exists(select 1 from public.entre_profiles where id=uid and onboarding_plan_selected) or not exists(select 1 from public.entre_profiles where id=_target and onboarding_plan_selected) then return jsonb_build_object('status','unavailable');end if;
 if exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=_target) or (b.blocker=_target and b.blocked=uid)) or exists(select 1 from public.entre_moderation m where m.user_id=_target and m.is_banned) then return jsonb_build_object('status','blocked','message','Esta pessoa não recebe solicitações de conversa.');end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,44108));
 perform pg_catalog.pg_advisory_xact_lock(hashtext(least(uid,_target)::text||greatest(uid,_target)::text));
 select p.id into opened from public.entre_pairs p where p.status='connected' and ((p.a=uid and p.b=_target) or (p.a=_target and p.b=uid)) order by p.created_at desc limit 1;
 if opened is not null then return jsonb_build_object('status','open','pair_id',opened);end if;
 select id into existing_id from public.entre_chat_requests where sender=uid and receiver=_target and status='pending';
 if existing_id is not null then return jsonb_build_object('status','pending','request_id',existing_id,'already_pending',true);end if;
 if exists(select 1 from public.entre_chat_requests where sender=_target and receiver=uid and status='pending') then return jsonb_build_object('status','incoming');end if;
 select exists(select 1 from public.entre_follows f where f.status='accepted' and ((f.follower=uid and f.followed=_target) or (f.follower=_target and f.followed=uid))) into known;
 if not known and not exists(select 1 from public.entre_presence pr where pr.user_id=_target and pr.allow_requests) then return jsonb_build_object('status','blocked','message','Esta pessoa não aceita solicitações de conversa de desconhecidos.');end if;
 select status,updated_at into last_status,last_change from public.entre_chat_requests where sender=uid and receiver=_target;
 if last_status='declined' and last_change>now()-interval '24 hours' then return jsonb_build_object('status','blocked','message','O pedido foi recusado. Aguarde 24 horas antes de tentar novamente.');end if;
 select count(*) into n from public.entre_chat_requests where sender=uid and updated_at>now()-interval '24 hours';
 if n>=15 then raise exception 'Limite diário de solicitações alcançado';end if;
 insert into public.entre_chat_requests(sender,receiver,status) values(uid,_target,'pending') on conflict(sender,receiver) do update set status='pending',updated_at=now(),created_at=now() returning id into existing_id;
 insert into public.entre_notifications(user_id,actor_id,kind) values(_target,uid,'chat_request');
 return jsonb_build_object('status','pending','request_id',existing_id,'already_pending',false);
end $$;
create function public.connect_discovery_privacy_me() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d jsonb; u uuid:=auth.uid();
begin
 d:=public.connect_discovery_me();
 return d||jsonb_build_object('online_visible',coalesce((select visible from public.entre_presence where user_id=u),false),'allow_requests',coalesce((select allow_requests from public.entre_presence where user_id=u),false));
end $$;
revoke all on function public.connect_discovery_privacy_me() from public,anon,authenticated;
grant execute on function public.connect_discovery_privacy_me() to authenticated;
create function public.connect_discovery_privacy_save(_interests text[],_goal text,_visible boolean,_online_visible boolean,_allow_requests boolean) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 perform public.connect_discovery_save(_interests,_goal,_visible);
 perform public.entre_online_settings(_online_visible,_allow_requests);
 return public.connect_discovery_privacy_me();
end $$;
revoke all on function public.connect_discovery_privacy_save(text[],text,boolean,boolean,boolean) from public,anon,authenticated;
grant execute on function public.connect_discovery_privacy_save(text[],text,boolean,boolean,boolean) to authenticated;

CREATE OR REPLACE FUNCTION public.connect_discovery_people_v2(_rotation integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();
begin
 if not public.connect_vnext_member() then raise exception 'Acesso indisponível';end if;
 return coalesce((
 with candidates as materialized (
 select p.id,p.username,p.display_name,p.age,p.avatar_path,p.avatar_uploaded_at,d.interests,d.goal,
 (select count(*)::int from unnest(d.interests) t where t=any(coalesce(me.interests,'{}'::text[]))) common,
 coalesce(pr.visible and pr.last_seen>now()-interval '5 minutes',false) online,
 coalesce(pr.allow_requests,false) allow_requests,
 (select cr.status from public.entre_chat_requests cr where cr.sender=u and cr.receiver=p.id) request_status,
 coalesce(me.goal=d.goal,false) same_goal,
 coalesce(cardinality(me.interests),0) my_count,
 coalesce(pr.visible and pr.last_seen>now()-interval '24 hours',false) recently_active,
 (('x'||substr(md5(u::text||':'||p.id::text||':'||current_date::text||':'||coalesce(_rotation,0)::text),1,7))::bit(28)::int)/268435455.0 noise
 from public.connect_discovery_profiles d join public.entre_profiles p on p.id=d.user_id
 left join public.connect_discovery_profiles me on me.user_id=u
 left join public.entre_presence pr on pr.user_id=p.id
 where connect_internal.world_visible(u,p.id) and d.visible and p.id<>u and p.onboarding_plan_selected and public.connect_vnext_visible(p.id)
 and not exists(select 1 from public.entre_follows f where f.status='accepted' and ((f.follower=u and f.followed=p.id) or (f.followed=u and f.follower=p.id)))
 and not exists(select 1 from public.entre_pairs ep where ep.status='connected' and ((ep.a=u and ep.b=p.id) or (ep.b=u and ep.a=p.id)))
 ), scored as (
 select *, (least(common,4)*1.1 + case when same_goal then 1.0 else 0 end
 + case when online then .7 when recently_active then .3 else 0 end + noise*2.2) affinity_score,
 (case when common=0 then 2.0 else 0 end + case when online then .5 else 0 end + noise*2.5) exploration_score
 from candidates
 ), exploration as (
 select *,row_number() over(order by exploration_score desc,id) pos from scored
 order by exploration_score desc,id limit (select least(10,(count(*)+2)/3) from scored)
 ), affinity as (
 select *,row_number() over(order by affinity_score desc,id) pos from scored
 where id not in(select id from exploration) order by affinity_score desc,id limit 20
 ), mixed as (
 select id,username,display_name,age,avatar_path,avatar_uploaded_at,interests,goal,common,online,allow_requests,request_status,
 case when common>0 then 'shared' when same_goal then 'goal' else 'explore' end reason,
 pos*3/2 sort_order,0 lane from affinity
 union all
 select id,username,display_name,age,avatar_path,avatar_uploaded_at,interests,goal,common,online,allow_requests,request_status,
 'explore' reason,pos*3-1 sort_order,1 lane from exploration
 )
 select jsonb_agg(to_jsonb(mixed)-'sort_order'-'lane' order by sort_order,lane,id) from mixed
 ),'[]'::jsonb);
end $function$;
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
      coalesce(ep.allow_requests,false) as allow_requests,
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
end; $function$;