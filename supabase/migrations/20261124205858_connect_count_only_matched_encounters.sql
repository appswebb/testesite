-- Serialize cancellation with pairing; debit only on successful pair creation.
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
 if _preference not in ('woman','man','nonbinary','any') then raise exception 'Preferência inválida';end if;
 if _mode not in ('chat','video') then raise exception 'Modo inválido';end if;
 if _preference<>'any' and not public.entre_premium_active(uid) then raise exception 'O filtro específico requer Premium' using errcode='42501';end if;
 if public.entre_is_banned() then raise exception 'Conta suspensa' using errcode='42501';end if;
 if not coalesce((select matchmaking_enabled from public.entre_site_settings where id=1),true)
  then raise exception 'Novas conexões estão temporariamente pausadas.';end if;
 if target_city_name is not null and target_uf is null then raise exception 'Selecione o estado da cidade';end if;
 if target_uf is not null and target_uf not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
 then raise exception 'Estado de busca inválido';end if;
 if target_city_name is not null and (char_length(target_city_name) not between 2 and 100 or target_city_name ~ '[<>[:cntrl:]]')
 then raise exception 'Cidade de busca inválida';end if;

 perform pg_advisory_xact_lock(53012026);
 select * into me from public.entre_profiles where id=uid;
 if not found then raise exception 'Complete seu perfil antes de conectar';end if;
 select state_code,city_name into me_state,me_city from public.entre_member_locations where user_id=uid;
 -- Searches by location must be reciprocal. The user's own city/state is needed
 -- to honor the other participant's geographic requirements.
 if target_uf is not null and me_state is null then
  raise exception 'Salve sua cidade e estado antes de usar filtros de proximidade';end if;

 update public.entre_pairs set status='closed',closed_at=now()
 where status='active' and expires_at<=now() and (a=uid or b=uid);
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
 target_state=excluded.target_state,target_city=excluded.target_city,last_seen=now();

 select q.user_id into candidate from public.entre_queue q
 join public.entre_profiles other on other.id=q.user_id
 left join public.entre_member_locations ol on ol.user_id=q.user_id
 where q.user_id<>uid and q.mode=_mode and q.last_seen>now()-interval '25 seconds'
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
 order by q.joined_at asc,q.user_id asc limit 1 for update of q;
 if candidate is not null then
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
$function$
;
CREATE OR REPLACE FUNCTION public.entre_leave()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null then raise exception 'Sessão inválida'; end if;
 perform pg_advisory_xact_lock(53012026);
 delete from public.entre_queue where user_id=auth.uid();
end $function$
;
-- One-time correction: the previous counter included abandoned searches. Reset only the deployment day's usage.
delete from public.connect_daily_search_usage where usage_date=(now() at time zone 'America/Sao_Paulo')::date;

