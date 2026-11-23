-- CONNECT: stable public @handles, privacy-aware discovery, and limited renames.
-- Existing profiles receive a deterministic temporary handle; users can replace it once.
alter table public.entre_profiles
  add column if not exists username text,
  add column if not exists username_changed_at timestamptz;

update public.entre_profiles
  set username='user_'||substr(replace(id::text,'-',''),1,14)
  where username is null;

create unique index if not exists entre_profiles_username_lower_uidx
  on public.entre_profiles (lower(username));

alter table public.entre_profiles alter column username set not null;

create or replace function public.entre_username_guard()
returns trigger language plpgsql set search_path to ''
as $$
begin
  if tg_op='INSERT' then
    new.username:=coalesce(nullif(lower(btrim(new.username)),''),
      'user_'||substr(replace(new.id::text,'-',''),1,14));
    if new.username not like 'user\_%' escape '\' then
      new.username_changed_at:=now();
    else
      new.username_changed_at:=null;
    end if;
  else
    new.username:=coalesce(nullif(lower(btrim(new.username)),''),old.username);
    if new.username is distinct from old.username then
      if old.username_changed_at is not null
        and old.username_changed_at>now()-interval '30 days' then
        raise exception 'Você poderá alterar seu @ novamente após 30 dias' using errcode='P0001';
      end if;
      new.username_changed_at:=now();
    else
      new.username_changed_at:=old.username_changed_at;
    end if;
  end if;
  if new.username !~ '^[a-z][a-z0-9_]{2,19}$' then
    raise exception 'O @ deve ter entre 3 e 20 caracteres: letras, números e _; comece com uma letra' using errcode='22023';
  end if;
  if new.username=any(array['admin','administrador','support','suporte','connect','sistema','system','moderador','moderation','oficial','official','root','null','undefined','everyone','todos']) then
    raise exception 'Este @ é reservado' using errcode='22023';
  end if;
  return new;
end; $$;

drop trigger if exists entre_username_guard_trigger on public.entre_profiles;
create trigger entre_username_guard_trigger
 before insert or update on public.entre_profiles
 for each row execute function public.entre_username_guard();

create or replace function public.entre_username_available(_username text)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare desired text:=lower(btrim(replace(coalesce(_username,''),'@','')));
begin
 if auth.uid() is null or public.entre_is_banned() or public.entre_maintenance_active() then return false; end if;
 if desired !~ '^[a-z][a-z0-9_]{2,19}$'
 or desired=any(array['admin','administrador','support','suporte','connect','sistema','system','moderador','moderation','oficial','official','root','null','undefined','everyone','todos'])
 then return false; end if;
 return not exists(select 1 from public.entre_profiles p where p.username=desired and p.id<>auth.uid());
end; $$;

revoke all on function public.entre_username_available(text) from public,anon;
grant execute on function public.entre_username_available(text) to authenticated;

-- Discover only safe public profile fields; banned/blocked accounts never appear.
create or replace function public.entre_user_search(_query text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
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
      coalesce(ep.visible and ep.last_seen>now()-interval '90 seconds',false) as is_online,
      coalesce(ep.visible and ep.allow_requests and ep.last_seen>now()-interval '90 seconds',false) as allow_requests,
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
end; $$;

revoke all on function public.entre_user_search(text) from public,anon;
grant execute on function public.entre_user_search(text) to authenticated;

-- Online directory includes @username so cards can show and share handles.
create or replace function public.entre_online_page(_offset integer default 0,_limit integer default 12)
returns jsonb language plpgsql security definer set search_path to ''
as $$
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
  where ep.visible and ep.last_seen>now()-interval '90 seconds'
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
end $$;

-- Following a discoverable @ works even if the account is offline.
-- Keep the existing blocking, moderation, and daily limits.
create or replace function public.entre_follow_request(_target uuid)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=auth.uid();current text;daily integer;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Conta indisponível';end if;
 if _target is null or _target=uid then raise exception 'Pessoa inválida';end if;
 if not exists(select 1 from public.entre_profiles ep where ep.id=_target)
 then raise exception 'Este perfil não está disponível para seguir';end if;
 if exists(select 1 from public.entre_blocks x where
 (x.blocker=uid and x.blocked=_target) or (x.blocker=_target and x.blocked=uid)) then raise exception 'Solicitação indisponível';end if;
 if exists(select 1 from public.entre_moderation x where x.user_id=_target and x.is_banned) then raise exception 'Pessoa indisponível';end if;
 select status into current from public.entre_follows where follower=uid and followed=_target;
 if current='accepted' then return jsonb_build_object('status','accepted');end if;
 if current='pending' then return jsonb_build_object('status','pending');end if;
 select count(*) into daily from public.entre_follows where follower=uid and updated_at>now()-interval '24 hours';
 if daily>=20 then raise exception 'Limite diário de solicitações atingido';end if;
 insert into public.entre_follows(follower,followed,status) values(uid,_target,'pending')
 on conflict(follower,followed) do update set status='pending',updated_at=now();
 insert into public.entre_notifications(user_id,actor_id,kind) values(_target,uid,'follow');
 return jsonb_build_object('status','pending');
end $$;
