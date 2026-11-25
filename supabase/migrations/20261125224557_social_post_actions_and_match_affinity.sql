
create table connect_internal.post_actions(
 user_id uuid not null references auth.users(id) on delete cascade,
 post_id bigint not null references public.entre_posts(id) on delete cascade,
 kind text not null check(kind in ('saved','reposted')),
 created_at timestamptz not null default now(),
 primary key(user_id,post_id,kind)
);
alter table connect_internal.post_actions enable row level security;
revoke all on connect_internal.post_actions from public,anon,authenticated;
create index connect_post_actions_by_post on connect_internal.post_actions(post_id,kind,user_id);
create function connect_internal.post_visible(_uid uuid,_post bigint) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.entre_posts p where p.id=_post and connect_internal.world_visible(_uid,p.author_id) and not exists(select 1 from public.entre_moderation m where m.user_id=p.author_id and m.is_banned) and not exists(select 1 from public.entre_blocks b where (b.blocker=_uid and b.blocked=p.author_id) or (b.blocker=p.author_id and b.blocked=_uid)));
$$;
revoke all on function connect_internal.post_visible(uuid,bigint) from public,anon,authenticated;
create function public.connect_post_action(_post bigint,_kind text,_enabled boolean) returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or public.entre_is_banned() or public.entre_maintenance_active() or _kind is null or _kind not in ('saved','reposted') or _enabled is null then raise exception 'Acesso indisponível' using errcode='42501';end if;
 if not _enabled then delete from connect_internal.post_actions where user_id=u and post_id=_post and kind=_kind;return false;end if;
 if not connect_internal.post_visible(u,_post) then raise exception 'Publicação indisponível';end if;
 if _kind='reposted' and exists(select 1 from public.entre_posts where id=_post and author_id=u) then raise exception 'Esta publicação já é sua';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,88421));
 if (select count(*) from connect_internal.post_actions where user_id=u and kind=_kind)>=1000 and not exists(select 1 from connect_internal.post_actions where user_id=u and post_id=_post and kind=_kind) then raise exception 'Limite alcançado';end if;
 insert into connect_internal.post_actions(user_id,post_id,kind) values(u,_post,_kind) on conflict do nothing;
 return true;
end $$;
revoke all on function public.connect_post_action(bigint,text,boolean) from public,anon,authenticated;
grant execute on function public.connect_post_action(bigint,text,boolean) to authenticated;
alter table public.entre_reports add column post_id bigint references public.entre_posts(id) on delete set null;
create function public.connect_report_post(_post bigint,_reason text,_details text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p public.entre_posts%rowtype; rid bigint;
begin
 if u is null or public.entre_is_banned() or public.entre_maintenance_active() or not coalesce((select reporting_enabled from public.entre_site_settings where id=1),true) then raise exception 'Denúncias indisponíveis';end if;
 if _reason is null or _reason not in ('harassment','hate','spam','underage','fake','other') or length(coalesce(_details,''))>350 then raise exception 'Motivo inválido';end if;
 if not connect_internal.post_visible(u,_post) then raise exception 'Publicação indisponível';end if;
 select * into p from public.entre_posts where id=_post;
 if p.author_id=u then raise exception 'Não é possível denunciar sua própria publicação';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,88422));
 if exists(select 1 from public.entre_reports where reporter_id=u and post_id=_post and created_at>now()-interval '24 hours') then raise exception 'Você já denunciou esta publicação recentemente';end if;
 if (select count(*) from public.entre_reports where reporter_id=u and created_at>now()-interval '24 hours')>=20 then raise exception 'Limite diário de denúncias';end if;
 insert into public.entre_reports(reporter_id,reported_id,post_id,reason,details) values(u,p.author_id,_post,_reason,left('Publicação #'||_post||E'\nTexto: '||left(coalesce(p.body,''),350)||E'\nRelato: '||coalesce(_details,''),800)) returning id into rid;
 return jsonb_build_object('id',rid,'status','open');
end $$;
revoke all on function public.connect_report_post(bigint,text,text) from public,anon,authenticated;
grant execute on function public.connect_report_post(bigint,text,text) to authenticated;
create table connect_internal.match_affinity(
 user_id uuid primary key references auth.users(id) on delete cascade,
 language text not null default '' check(language in ('','pt','en','es','fr','de','it','ja','ko','zh','ar','ru','hi','id','tr','uk','nl','pl','sv','vi','th')),
 interests boolean not null default false, goal boolean not null default false
);
alter table connect_internal.match_affinity enable row level security;
revoke all on connect_internal.match_affinity from public,anon,authenticated;
create function public.connect_match_preferences() returns jsonb language sql stable security definer set search_path='' as $$
select coalesce((select jsonb_build_object('language',language,'interests',interests,'goal',goal) from connect_internal.match_affinity where user_id=auth.uid()),'{"language":"","interests":false,"goal":false}'::jsonb) where auth.uid() is not null and not public.entre_is_banned();
$$;
revoke all on function public.connect_match_preferences() from public,anon,authenticated;
grant execute on function public.connect_match_preferences() to authenticated;
create function public.connect_match_preferences_save(_language text,_interests boolean,_goal boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or public.entre_is_banned() or public.entre_maintenance_active() or not exists(select 1 from public.entre_profiles where id=u) then raise exception 'Acesso indisponível';end if;
 perform pg_advisory_xact_lock(53012026,hashtext(u::text));
 if exists(select 1 from public.entre_queue where user_id=u and last_seen>now()-interval '25 seconds') then raise exception 'Cancele a busca antes de alterar as preferências';end if;
 insert into connect_internal.match_affinity(user_id,language,interests,goal) values(u,_language,_interests,_goal) on conflict(user_id) do update set language=excluded.language,interests=excluded.interests,goal=excluded.goal;
 return public.connect_match_preferences();
end $$;
revoke all on function public.connect_match_preferences_save(text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.connect_match_preferences_save(text,boolean,boolean) to authenticated;
create function connect_internal.match_affinity_score(_a uuid,_b uuid) returns integer language sql stable security definer set search_path='' as $$
select coalesce((select (case when a.language<>'' and a.language=b.language then 4 else 0 end)+(case when a.interests and b.interests and da.interests && db.interests then 3 else 0 end)+(case when a.goal and b.goal and da.goal=db.goal then 2 else 0 end)
 from connect_internal.match_affinity a join connect_internal.match_affinity b on b.user_id=_b left join public.connect_discovery_profiles da on da.user_id=_a left join public.connect_discovery_profiles db on db.user_id=_b where a.user_id=_a),0);
$$;
revoke all on function connect_internal.match_affinity_score(uuid,uuid) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.connect_feed_v2(_before bigint DEFAULT NULL::bigint, _mode text DEFAULT 'recent'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();items jsonb;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 if _mode not in ('recent','following','recommended','trending','region','saved','single') or _mode is null then raise exception 'Filtro inválido'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',p.id,'body',p.body,'media_path',p.media_path,'media_type',p.media_type,'created_at',p.created_at,'edited_at',p.edited_at,
  'author_id',p.author_id,'author_name',a.display_name,'author_avatar',a.avatar_path,'author_avatar_uploaded_at',a.avatar_uploaded_at,
  'premium',public.entre_premium_active(p.author_id),
  'likes',(select count(*) from public.entre_post_likes l where l.post_id=p.id),
  'liked',(select exists(select 1 from public.entre_post_likes l where l.post_id=p.id and l.user_id=uid)),
 'saved',exists(select 1 from connect_internal.post_actions z where z.user_id=uid and z.post_id=p.id and z.kind='saved'),
 'reposted',exists(select 1 from connect_internal.post_actions z where z.user_id=uid and z.post_id=p.id and z.kind='reposted'),
 'reposts',(select count(*) from connect_internal.post_actions z where z.post_id=p.id and z.kind='reposted' and connect_internal.world_visible(uid,z.user_id) and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=z.user_id) or (b.blocker=z.user_id and b.blocked=uid))),
 'reposted_by',(select pr.display_name from connect_internal.post_actions z join public.entre_follows f on f.followed=z.user_id and f.follower=uid and f.status='accepted' join public.entre_profiles pr on pr.id=z.user_id where z.post_id=p.id and z.kind='reposted' and connect_internal.world_visible(uid,z.user_id) and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=z.user_id) or (b.blocker=z.user_id and b.blocked=uid)) and not exists(select 1 from public.entre_moderation m where m.user_id=z.user_id and m.is_banned) order by z.created_at desc limit 1),
  'comments',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'author_id',c.author_id,'name',coalesce(cp.display_name,'Pessoa'),'premium',public.entre_premium_active(c.author_id),'created_at',c.created_at) order by c.created_at),'[]'::jsonb)
    from (select pc.* from public.entre_post_comments pc where pc.post_id=p.id and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=pc.author_id) or (b.blocker=pc.author_id and b.blocked=uid)) and not exists(select 1 from public.entre_moderation m where m.user_id=pc.author_id and m.is_banned) order by pc.created_at desc limit 10) c
    left join public.entre_profiles cp on cp.id=c.author_id)
 ) order by case when _mode='trending' then (select count(*) from public.entre_post_likes l where l.post_id=p.id) else 0 end desc, p.id desc),'[]'::jsonb) into items
 from (select pp.* from public.entre_posts pp join public.entre_profiles pr on pr.id=pp.author_id where connect_internal.world_visible(uid,pp.author_id) and (case when _mode='single' then pp.id=_before else (_before is null or pp.id<_before) end) and (
 _mode in ('recent','single') or (_mode='saved' and exists(select 1 from connect_internal.post_actions z where z.user_id=uid and z.post_id=pp.id and z.kind='saved')) or (_mode='following' and exists(select 1 from connect_internal.post_actions z join public.entre_follows f on f.followed=z.user_id and f.follower=uid and f.status='accepted' where z.post_id=pp.id and z.kind='reposted' and connect_internal.world_visible(uid,z.user_id) and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=z.user_id) or (b.blocker=z.user_id and b.blocked=uid)) and not exists(select 1 from public.entre_moderation m where m.user_id=z.user_id and m.is_banned))) or (_mode='following' and (pp.author_id=uid or exists(select 1 from public.entre_follows f where f.follower=uid and f.followed=pp.author_id and f.status='accepted')))
 or (_mode='region' and exists(select 1 from connect_internal.world_preferences a join connect_internal.world_preferences b on b.country=a.country where a.user_id=uid and b.user_id=pp.author_id))
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
 order by (connect_internal.match_affinity_score(uid,q.user_id)+least(10,extract(epoch from (now()-q.joined_at))/15)) desc,q.joined_at asc,q.user_id asc limit 24
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

CREATE OR REPLACE FUNCTION public.entre_admin_reports(_status text DEFAULT 'all'::text, _limit integer DEFAULT 60)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501'; end if;
 with report_rows as (
  select r.id,r.reporter_id,r.reported_id,r.pair_id,r.post_id,r.reason,r.details,r.status,r.admin_note,r.created_at,r.reviewed_at,r.retention_hold,
    coalesce(reporter.display_name,ur.email,'Conta excluída') as reporter_name,
    coalesce(reported.display_name,ud.email,'Conta excluída') as reported_name
  from public.entre_reports r
  left join public.entre_profiles reporter on reporter.id=r.reporter_id
  left join public.entre_profiles reported on reported.id=r.reported_id
  left join auth.users ur on ur.id=r.reporter_id
  left join auth.users ud on ud.id=r.reported_id
  where _status='all' or r.status=_status
  order by r.created_at desc
  limit least(greatest(coalesce(_limit,60),1),100)
 )
 select coalesce(jsonb_agg(to_jsonb(report_rows) order by created_at desc),'[]'::jsonb) into result from report_rows;
 return result;
end $function$;

CREATE OR REPLACE FUNCTION public.entre_site_posts_search(_query text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=auth.uid(); t text:=left(btrim(coalesce(_query,'')),60); result jsonb;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Busca indisponível' using errcode='42501';end if;
 if char_length(t)<2 then return '[]'::jsonb;end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]'::jsonb) into result
 from (select p.id,left(p.body,220) body,p.created_at,pr.display_name,pr.username
 from public.entre_posts p join public.entre_profiles pr on pr.id=p.author_id
 where connect_internal.world_visible(me,p.author_id) and (p.body ilike '%'||t||'%' or pr.display_name ilike '%'||t||'%')
 and not exists(select 1 from public.entre_moderation m where m.user_id=p.author_id and m.is_banned)
 and not exists(select 1 from public.entre_blocks b where (b.blocker=me and b.blocked=p.author_id) or (b.blocker=p.author_id and b.blocked=me))
 order by p.id desc limit 12) x;
 return result;
end $function$;
