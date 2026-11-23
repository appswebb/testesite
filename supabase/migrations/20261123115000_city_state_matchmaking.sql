-- Location at city/state granularity. Precise GPS coordinates are never stored.
create table if not exists public.entre_member_locations (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state_code text not null,
 city_name text not null,
 updated_at timestamptz not null default now(),
 constraint entre_member_location_uf check (state_code in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
 constraint entre_member_location_city check (char_length(city_name) between 2 and 100)
);
alter table public.entre_member_locations enable row level security;
revoke all on table public.entre_member_locations from public, anon, authenticated;
create index if not exists entre_member_locations_area_idx on public.entre_member_locations(state_code,lower(city_name));
alter table public.entre_queue add column if not exists target_state text;
alter table public.entre_queue add column if not exists target_city text;
create index if not exists entre_queue_mode_area_idx on public.entre_queue(mode,last_seen);

create or replace function public.entre_my_location()
returns jsonb language sql stable security definer set search_path to ''
as $$
 select case when (select auth.uid()) is null then null
 else (select jsonb_build_object('state',l.state_code,'city',l.city_name)
       from public.entre_member_locations l where l.user_id=(select auth.uid())) end
$$;
create or replace function public.entre_set_location(_state text,_city text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=(select auth.uid()); cleaned_city text; cleaned_state text;
begin
 if uid is null or public.entre_is_banned() then raise exception 'Acesso negado' using errcode='42501';end if;
 cleaned_state:=upper(trim(coalesce(_state,'')));
 cleaned_city:=trim(regexp_replace(coalesce(_city,''),'[[:space:]]+',' ','g'));
 if cleaned_state not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
    or char_length(cleaned_city) not between 2 and 100
    or cleaned_city ~ '[<>[:cntrl:]]'
 then raise exception 'Selecione um estado e uma cidade válidos';end if;
 insert into public.entre_member_locations(user_id,state_code,city_name,updated_at)
 values(uid,cleaned_state,cleaned_city,now())
 on conflict(user_id) do update set state_code=excluded.state_code,city_name=excluded.city_name,updated_at=now();
 return jsonb_build_object('state',cleaned_state,'city',cleaned_city);
end;
$$;

create or replace function public.entre_find_mode_location(
 _preference text, _mode text, _target_state text, _target_city text
) returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
 uid uuid := (select auth.uid());
 me public.entre_profiles%rowtype;
 candidate uuid;
 current_pair uuid;
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
  return jsonb_build_object('status','matched','pair_id',current_pair);
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
  and not exists(select 1 from public.entre_pairs known where known.status='connected' and ((known.a=uid and known.b=q.user_id) or (known.b=uid and known.a=q.user_id)))
 order by q.joined_at asc limit 1;
 if candidate is not null then
  insert into public.entre_pairs(a,b,mode) values(candidate,uid,_mode) returning id into current_pair;
  delete from public.entre_queue where user_id in(uid,candidate);
  return jsonb_build_object('status','matched','pair_id',current_pair);
 end if;
 return jsonb_build_object('status','waiting');
end;
$$;
-- Route legacy match endpoints through the same protected pool: no video user
-- can be picked by a text-only request, and both sides' area filters are respected.
create or replace function public.entre_find_mode(_preference text,_mode text)
returns jsonb language sql security definer set search_path to ''
as $$ select public.entre_find_mode_location(_preference,_mode,null,null) $$;
create or replace function public.entre_find(_preference text default 'any')
returns jsonb language sql security definer set search_path to ''
as $$ select public.entre_find_mode_location(_preference,'chat',null,null) $$;
revoke all on function public.entre_my_location() from public,anon;
revoke all on function public.entre_set_location(text,text) from public,anon;
revoke all on function public.entre_find_mode_location(text,text,text,text) from public,anon;
grant execute on function public.entre_my_location() to authenticated;
grant execute on function public.entre_set_location(text,text) to authenticated;
grant execute on function public.entre_find_mode_location(text,text,text,text) to authenticated;
