create table public.connect_daily_search_usage(
 user_id uuid not null references auth.users(id) on delete cascade,
 usage_date date not null, used integer not null check(used between 1 and 50),
 primary key(user_id,usage_date)
);
alter table public.connect_daily_search_usage enable row level security;
revoke all on public.connect_daily_search_usage from public,anon,authenticated;
create or replace function public.connect_search_quota() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); day_br date:=(now() at time zone 'America/Sao_Paulo')::date; n int; unlimited boolean;
begin
 if uid is null or public.entre_is_banned() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 unlimited:=public.entre_premium_active(uid);
 select used into n from public.connect_daily_search_usage where user_id=uid and usage_date=day_br;
 n:=coalesce(n,0);
 return jsonb_build_object('unlimited',unlimited,'used',n,'limit',case when unlimited then null else 50 end,'remaining',case when unlimited then null else greatest(0,50-n) end,'reset_at',((day_br+1)::timestamp at time zone 'America/Sao_Paulo'));
end $$;
revoke all on function public.connect_search_quota() from public,anon;
grant execute on function public.connect_search_quota() to authenticated;
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
 used_count integer := 0;
 unlimited boolean;
 continuing boolean;
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
 select exists(select 1 from public.entre_queue q where q.user_id=uid and q.last_seen>now()-interval '25 seconds' and q.preference=_preference and q.mode=_mode and q.target_state is not distinct from target_uf and q.target_city is not distinct from target_city_name) into continuing;
 if not unlimited and not continuing then
  insert into public.connect_daily_search_usage(user_id,usage_date,used) values(uid,usage_day,1)
  on conflict(user_id,usage_date) do update set used=public.connect_daily_search_usage.used+1 where public.connect_daily_search_usage.used<50 returning used into used_count;
  if not found then
   delete from public.entre_queue where user_id=uid;
   return jsonb_build_object('status','daily_limit','quota',public.connect_search_quota());
  end if;
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
  and not exists(select 1 from public.entre_moderation m where m.user_id=q.user_id and m.is_banned)
  and not exists(select 1 from public.entre_blocks x where (x.blocker=uid and x.blocked=q.user_id) or(x.blocker=q.user_id and x.blocked=uid))
  and not exists(select 1 from public.entre_pairs r where (r.a=q.user_id or r.b=q.user_id) and r.status='active' and r.expires_at>now())
  and not exists(select 1 from public.entre_follows f where f.status='accepted' and ((f.follower=uid and f.followed=q.user_id) or (f.followed=uid and f.follower=q.user_id)))
 order by q.joined_at asc,q.user_id asc limit 1;
 if candidate is not null then
  insert into public.entre_pairs(a,b,mode) values(candidate,uid,_mode) returning id into current_pair;
  delete from public.entre_queue where user_id in(uid,candidate);
  return jsonb_build_object('status','matched','pair_id',current_pair,'quota',public.connect_search_quota());
 end if;
 return jsonb_build_object('status','waiting','quota',public.connect_search_quota());
end;
$function$
;

