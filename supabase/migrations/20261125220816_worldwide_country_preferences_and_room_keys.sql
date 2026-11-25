
create table connect_internal.world_preferences(user_id uuid primary key references auth.users(id) on delete cascade,country text not null check(country in ('AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW')),scope text not null default 'world' check(scope in ('world','country')),language text not null default 'pt' check(language in ('pt','en','es','fr','de','it','ja','ko','zh','ar','ru','hi','id','tr','uk','nl','pl','sv','vi','th')),updated_at timestamptz not null default now());
alter table connect_internal.world_preferences enable row level security;
revoke all on connect_internal.world_preferences from public,anon,authenticated;
insert into connect_internal.world_preferences(user_id,country) select user_id,'BR' from public.entre_member_locations on conflict do nothing;
create function public.connect_world_me() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('country',country,'scope',scope,'language',language) from connect_internal.world_preferences where user_id=auth.uid()),'{"country":"","scope":"world","language":"pt"}'::jsonb) where auth.uid() is not null;
$$;
revoke all on function public.connect_world_me() from public,anon,authenticated;
grant execute on function public.connect_world_me() to authenticated;
create function public.connect_world_save(_country text,_scope text,_language text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 if not exists(select 1 from public.entre_profiles where id=u) then raise exception 'Complete seu perfil';end if;
 perform pg_advisory_xact_lock(53012026,hashtext(u::text));
 insert into connect_internal.world_preferences(user_id,country,scope,language) values(u,upper(trim(_country)),_scope,_language)
 on conflict(user_id) do update set country=excluded.country,scope=excluded.scope,language=excluded.language,updated_at=now();
 delete from public.entre_queue where user_id=u;
 return public.connect_world_me();
end $$;
revoke all on function public.connect_world_save(text,text,text) from public,anon,authenticated;
grant execute on function public.connect_world_save(text,text,text) to authenticated;
create function connect_internal.world_visible(_viewer uuid,_other uuid) returns boolean language sql stable security definer set search_path='' as $$
 select _viewer=_other or not exists(select 1 from connect_internal.world_preferences a where a.user_id=_viewer and a.scope='country' and not exists(select 1 from connect_internal.world_preferences b where b.user_id=_other and b.country=a.country));
$$;
revoke all on function connect_internal.world_visible(uuid,uuid) from public,anon,authenticated;
create function connect_internal.country_is_br(_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from connect_internal.world_preferences where user_id=_user and country<>'BR');
$$;
revoke all on function connect_internal.country_is_br(uuid) from public,anon,authenticated;
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
 select id,username,display_name,age,avatar_path,avatar_uploaded_at,interests,goal,common,online,
 case when common>0 then 'shared' when same_goal then 'goal' else 'explore' end reason,
 pos*3/2 sort_order,0 lane from affinity
 union all
 select id,username,display_name,age,avatar_path,avatar_uploaded_at,interests,goal,common,online,
 'explore' reason,pos*3-1 sort_order,1 lane from exploration
 )
 select jsonb_agg(to_jsonb(mixed)-'sort_order'-'lane' order by sort_order,lane,id) from mixed
 ),'[]'::jsonb);
end $function$;

CREATE OR REPLACE FUNCTION public.connect_feed_v2(_before bigint DEFAULT NULL::bigint, _mode text DEFAULT 'recent'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();items jsonb;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 if _mode not in ('recent','following','recommended','trending','region') or _mode is null then raise exception 'Filtro inválido'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',p.id,'body',p.body,'media_path',p.media_path,'media_type',p.media_type,'created_at',p.created_at,'edited_at',p.edited_at,
  'author_id',p.author_id,'author_name',a.display_name,'author_avatar',a.avatar_path,'author_avatar_uploaded_at',a.avatar_uploaded_at,
  'premium',public.entre_premium_active(p.author_id),
  'likes',(select count(*) from public.entre_post_likes l where l.post_id=p.id),
  'liked',(select exists(select 1 from public.entre_post_likes l where l.post_id=p.id and l.user_id=uid)),
  'comments',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'author_id',c.author_id,'name',coalesce(cp.display_name,'Pessoa'),'premium',public.entre_premium_active(c.author_id),'created_at',c.created_at) order by c.created_at),'[]'::jsonb)
    from (select pc.* from public.entre_post_comments pc where pc.post_id=p.id and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=pc.author_id) or (b.blocker=pc.author_id and b.blocked=uid)) and not exists(select 1 from public.entre_moderation m where m.user_id=pc.author_id and m.is_banned) order by pc.created_at desc limit 10) c
    left join public.entre_profiles cp on cp.id=c.author_id)
 ) order by case when _mode='trending' then (select count(*) from public.entre_post_likes l where l.post_id=p.id) else 0 end desc, p.id desc),'[]'::jsonb) into items
 from (select pp.* from public.entre_posts pp join public.entre_profiles pr on pr.id=pp.author_id where connect_internal.world_visible(uid,pp.author_id) and (_before is null or pp.id<_before) and (
 _mode='recent' or (_mode='following' and (pp.author_id=uid or exists(select 1 from public.entre_follows f where f.follower=uid and f.followed=pp.author_id and f.status='accepted')))
 or (_mode='region' and exists(select 1 from public.entre_member_locations a join public.entre_member_locations b on a.state_code=b.state_code where a.user_id=uid and b.user_id=pp.author_id and a.state_code is not null and connect_internal.country_is_br(uid) and connect_internal.country_is_br(pp.author_id)))
 or (_mode='recommended' and (pp.author_id=uid or exists(select 1 from public.connect_discovery_profiles a join public.connect_discovery_profiles b on a.interests && b.interests where a.user_id=uid and b.user_id=pp.author_id and b.visible)))
 or (_mode='trending' and pp.created_at>now()-interval '72 hours')) and not exists(select 1 from public.entre_moderation m where m.user_id=pp.author_id and m.is_banned) and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=pp.author_id) or (b.blocker=pp.author_id and b.blocked=uid)) order by case when _mode='trending' then (select count(*) from public.entre_post_likes l where l.post_id=pp.id) else 0 end desc,pp.id desc limit 15) p join public.entre_profiles a on a.id=p.author_id;
 return items;
end $function$;

CREATE OR REPLACE FUNCTION public.entre_find_mode_location(_preference text, _mode text, _target_state text, _target_city text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid := (select auth.uid());
 me public.entre_profiles%rowtype;
 candidate uuid;
 proposed uuid;
 locked_candidate uuid;
 current_pair uuid;
 usage_day date := (now() at time zone 'America/Sao_Paulo')::date;
 unlimited boolean;
 candidate_unlimited boolean;
 me_state text;
 me_city text;
 target_uf text := nullif(upper(trim(coalesce(_target_state,''))),'');
 target_city_name text := nullif(trim(coalesce(_target_city,'')),'');
begin
 if uid is null then raise exception 'Sessão inválida' using errcode='42501';end if;
 if public.entre_maintenance_active() then raise exception 'O entre. está em atualização.';end if;
 if _preference is null or _preference not in ('woman','man','nonbinary','any') then raise exception 'Preferência inválida';end if;
 if _mode is null or _mode not in ('chat','video') then raise exception 'Modo inválido';end if;
 if _preference<>'any' and not public.entre_premium_active(uid) then raise exception 'O filtro específico requer Premium' using errcode='42501';end if;
 if public.entre_is_banned() then raise exception 'Conta suspensa' using errcode='42501';end if;
 if not coalesce((select matchmaking_enabled from public.entre_site_settings where id=1),true)
  then raise exception 'Novas conexões estão temporariamente pausadas.';end if;
 if target_city_name is not null and target_uf is null then raise exception 'Selecione o estado da cidade';end if;
 if target_uf is not null and target_uf not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
 then raise exception 'Estado de busca inválido';end if;
 if target_city_name is not null and (char_length(target_city_name) not between 2 and 100 or target_city_name ~ '[<>[:cntrl:]]')
 then raise exception 'Cidade de busca inválida';end if;

 -- Serialize only requests for this account. Other accounts can proceed.
 perform pg_advisory_xact_lock(53012026, hashtext(uid::text));
 if public.entre_maintenance_active() or public.entre_is_banned() then raise exception 'Conta indisponível' using errcode='42501';end if;
 select * into me from public.entre_profiles where id=uid;
 if not found then raise exception 'Complete seu perfil antes de conectar';end if;
 select state_code,city_name into me_state,me_city from public.entre_member_locations where user_id=uid;
 -- Searches by location must be reciprocal. The user's own city/state is needed
 -- to honor the other participant's geographic requirements.
 if target_uf is not null and not connect_internal.country_is_br(uid) then raise exception 'Filtros de estado e cidade disponíveis apenas no Brasil';end if;
 if target_uf is not null and me_state is null then
  raise exception 'Salve sua cidade e estado antes de usar filtros de proximidade';end if;

 select p.id into current_pair from public.entre_pairs p
 where p.status='active' and p.expires_at>now() and (p.a=uid or p.b=uid)
 order by p.created_at desc limit 1;
 if current_pair is not null then
  delete from public.entre_queue where user_id=uid;
  return jsonb_build_object('status','matched','pair_id',current_pair,'quota',public.connect_search_quota());
 end if;

 unlimited:=public.entre_premium_active(uid);
 if not unlimited and exists(select 1 from public.connect_daily_search_usage d where d.user_id=uid and d.usage_date=usage_day and d.used>=50) then
  delete from public.entre_queue where user_id=uid;
  return jsonb_build_object('status','daily_limit','quota',public.connect_search_quota());
 end if;
 insert into public.entre_queue(user_id,preference,mode,target_state,target_city,joined_at,last_seen)
 values(uid,_preference,_mode,target_uf,target_city_name,now(),now())
 on conflict(user_id) do update set preference=excluded.preference,mode=excluded.mode,
 target_state=excluded.target_state,target_city=excluded.target_city,last_seen=now(),
 joined_at=case when public.entre_queue.last_seen<=now()-interval '25 seconds' or (public.entre_queue.preference,public.entre_queue.mode,public.entre_queue.target_state,public.entre_queue.target_city) is distinct from (excluded.preference,excluded.mode,excluded.target_state,excluded.target_city) then now() else public.entre_queue.joined_at end;

 -- Pick a bounded set of eligible participants in queue order.
 -- Try, never wait for, a candidate account or pair currently reserved by another transaction.
 candidate:=null;
 for proposed in
 select q.user_id from public.entre_queue q
 join public.entre_profiles other on other.id=q.user_id
 left join public.entre_member_locations ol on ol.user_id=q.user_id
 where q.user_id<>uid and q.mode=_mode and q.last_seen>now()-interval '25 seconds'
  and connect_internal.world_visible(uid,q.user_id) and connect_internal.world_visible(q.user_id,uid)
  and (target_uf is null or connect_internal.country_is_br(q.user_id))
  and (q.target_state is null or connect_internal.country_is_br(uid))
  and (_preference='any' or other.gender=_preference)
  and (q.preference='any' or q.preference=me.gender)
  and (target_uf is null or ol.state_code=target_uf)
  and (target_city_name is null or lower(ol.city_name)=lower(target_city_name))
  and (q.target_state is null or q.target_state=me_state)
  and (q.target_city is null or lower(q.target_city)=lower(me_city))
  and (public.entre_premium_active(q.user_id) or not exists(select 1 from public.connect_daily_search_usage d where d.user_id=q.user_id and d.usage_date=usage_day and d.used>=50))
  and (q.preference='any' or public.entre_premium_active(q.user_id))
  and not exists(select 1 from public.entre_moderation m where m.user_id=q.user_id and m.is_banned)
  and not exists(select 1 from public.entre_blocks x where (x.blocker=uid and x.blocked=q.user_id) or(x.blocker=q.user_id and x.blocked=uid))
  and not exists(select 1 from public.entre_pairs r where (r.a=q.user_id or r.b=q.user_id) and r.status='active' and r.expires_at>now())
  and not exists(select 1 from public.entre_follows f where f.status='accepted' and ((f.follower=uid and f.followed=q.user_id) or (f.followed=uid and f.follower=q.user_id)))
  and not exists(select 1 from public.entre_pairs r where r.status='connected' and ((r.a=uid and r.b=q.user_id) or (r.b=uid and r.a=q.user_id)))
 order by q.joined_at asc,q.user_id asc limit 24
 loop
  if not pg_try_advisory_xact_lock(53012026,hashtext(proposed::text)) then continue; end if;
  if not pg_try_advisory_xact_lock(hashtext(least(uid,proposed)::text||greatest(uid,proposed)::text)) then continue; end if;
  locked_candidate:=null;
  select q.user_id into locked_candidate from public.entre_queue q
 join public.entre_profiles other on other.id=q.user_id
 left join public.entre_member_locations ol on ol.user_id=q.user_id
 where q.user_id=proposed and q.user_id<>uid and q.mode=_mode and q.last_seen>now()-interval '25 seconds'
  and connect_internal.world_visible(uid,q.user_id) and connect_internal.world_visible(q.user_id,uid)
  and (target_uf is null or connect_internal.country_is_br(q.user_id))
  and (q.target_state is null or connect_internal.country_is_br(uid))
  and (_preference='any' or other.gender=_preference)
  and (q.preference='any' or q.preference=me.gender)
  and (target_uf is null or ol.state_code=target_uf)
  and (target_city_name is null or lower(ol.city_name)=lower(target_city_name))
  and (q.target_state is null or q.target_state=me_state)
  and (q.target_city is null or lower(q.target_city)=lower(me_city))
  and (public.entre_premium_active(q.user_id) or not exists(select 1 from public.connect_daily_search_usage d where d.user_id=q.user_id and d.usage_date=usage_day and d.used>=50))
  and (q.preference='any' or public.entre_premium_active(q.user_id))
  and not exists(select 1 from public.entre_moderation m where m.user_id=q.user_id and m.is_banned)
  and not exists(select 1 from public.entre_blocks x where (x.blocker=uid and x.blocked=q.user_id) or(x.blocker=q.user_id and x.blocked=uid))
  and not exists(select 1 from public.entre_pairs r where (r.a=q.user_id or r.b=q.user_id) and r.status='active' and r.expires_at>now())
  and not exists(select 1 from public.entre_follows f where f.status='accepted' and ((f.follower=uid and f.followed=q.user_id) or (f.followed=uid and f.follower=q.user_id)))
  and not exists(select 1 from public.entre_pairs r where r.status='connected' and ((r.a=uid and r.b=q.user_id) or (r.b=uid and r.a=q.user_id)))
  for update of q skip locked;
  if locked_candidate is null then continue;end if;
  candidate:=locked_candidate;
  exit;
 end loop;
 if candidate is not null then
  if public.entre_maintenance_active() or public.entre_is_banned() or not coalesce((select matchmaking_enabled from public.entre_site_settings where id=1),true) then raise exception 'Busca indisponível' using errcode='42501';end if;
  -- Both participants consume exactly one encounter, in the same transaction as pair creation.
  candidate_unlimited:=public.entre_premium_active(candidate);
  if not candidate_unlimited and exists(select 1 from public.connect_daily_search_usage d where d.user_id=candidate and d.usage_date=usage_day and d.used>=50) then
   delete from public.entre_queue where user_id=candidate;
   return jsonb_build_object('status','waiting','quota',public.connect_search_quota());
  end if;
  if not unlimited then
   insert into public.connect_daily_search_usage(user_id,usage_date,used) values(uid,usage_day,1)
   on conflict(user_id,usage_date) do update set used=public.connect_daily_search_usage.used+1 where public.connect_daily_search_usage.used<50;
   if not found then raise exception 'Limite diário atingido';end if;
  end if;
  if not candidate_unlimited then
   insert into public.connect_daily_search_usage(user_id,usage_date,used) values(candidate,usage_day,1)
   on conflict(user_id,usage_date) do update set used=public.connect_daily_search_usage.used+1 where public.connect_daily_search_usage.used<50;
   if not found then raise exception 'Limite diário do participante atingido';end if;
  end if;
  insert into public.entre_pairs(a,b,mode) values(candidate,uid,_mode) returning id into current_pair;
  delete from public.entre_queue where user_id in(uid,candidate);
  return jsonb_build_object('status','matched','pair_id',current_pair,'quota',public.connect_search_quota());
 end if;
 return jsonb_build_object('status','waiting','quota',public.connect_search_quota());
end;
$function$;

CREATE OR REPLACE FUNCTION public.entre_room_key(_room text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uf text; city text;valid text[]:=array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO','MG'];
begin
 _room:=lower(btrim(coalesce(_room,'')));
 if _room='world' then return _room;end if;
 if _room='br' then return 'br';end if;
 if _room ~ '^n:[a-z]{2}$' and upper(substring(_room from 3)) in ('AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW') then
  if _room='n:br' then return 'br';end if;return _room;
 end if;
 if _room ~ '^s:[a-z]{2}$' then
  uf:=upper(substring(_room from 3));
  if uf=any(valid) then return 's:'||lower(uf);end if;
 end if;
 if _room ~ '^c:[a-z]{2}:[a-z0-9][a-z0-9_-]{1,79}$' then
  uf:=upper(substring(_room from 3 for 2));city:=substring(_room from 6);
  if uf=any(valid) and exists(select 1 from public.entre_official_cities c where c.state_code=lower(uf) and c.city_key=city) then return _room;end if;
 end if;
 raise exception 'Apenas salas oficiais de municípios válidos são permitidas' using errcode='22023';
end $function$;

create or replace function public.entre_posts_feed(_before bigint default null) returns jsonb language sql stable security definer set search_path='' as $$ select public.connect_feed_v2(_before,'recent') $$;;
