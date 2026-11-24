create table if not exists public.connect_live_restrictions(
 live_id uuid not null references public.entre_lives(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 banned boolean not null default false, muted_until timestamptz,
 updated_at timestamptz not null default now(), primary key(live_id,user_id)
);
create index if not exists connect_live_restrictions_user on public.connect_live_restrictions(user_id);
alter table public.connect_live_restrictions enable row level security;
revoke all on public.connect_live_restrictions from public,anon,authenticated;
grant select on public.connect_live_restrictions to service_role;
create or replace function public.connect_live_moderate(_live uuid,_target uuid default null,_action text default 'list')
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); l public.entre_lives%rowtype; result jsonb;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 select * into l from public.entre_lives where id=_live and status='active' and expires_at>now();
 if not found or l.host_id<>me then raise exception 'Somente o anfitrião pode moderar' using errcode='42501';end if;
 if _action<>'list' then
  if _target is null or _target=me then raise exception 'Participante inválido';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_target::text||_live::text,0));
  if _action in ('mute5','mute30','mute_live','ban') then
   insert into public.connect_live_restrictions(live_id,user_id,banned,muted_until)
   values(_live,_target,_action='ban',case _action when 'mute5' then now()+interval '5 minutes' when 'mute30' then now()+interval '30 minutes' when 'mute_live' then l.expires_at else null end)
   on conflict(live_id,user_id) do update set banned=public.connect_live_restrictions.banned or excluded.banned,muted_until=coalesce(excluded.muted_until,public.connect_live_restrictions.muted_until),updated_at=now();
   delete from public.connect_live_comments where live_id=_live and user_id=_target;
   if _action='ban' then update public.entre_lives set guest_id=case when guest_id=_target then null else guest_id end,guest_requested_by=case when guest_requested_by=_target then null else guest_requested_by end where id=_live;end if;
  elsif _action='unmute' then update public.connect_live_restrictions set muted_until=null,updated_at=now() where live_id=_live and user_id=_target;
  elsif _action='unban' then update public.connect_live_restrictions set banned=false,updated_at=now() where live_id=_live and user_id=_target;
  else raise exception 'Ação inválida';end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',r.user_id,'name',coalesce(p.display_name,'Pessoa'),'banned',r.banned,'muted_until',r.muted_until) order by r.updated_at desc),'[]'::jsonb) into result from public.connect_live_restrictions r left join public.entre_profiles p on p.id=r.user_id where r.live_id=_live and (r.banned or r.muted_until>now());
 return result;
end $$;
revoke all on function public.connect_live_moderate(uuid,uuid,text) from public,anon;
grant execute on function public.connect_live_moderate(uuid,uuid,text) to authenticated;
create or replace function public.connect_live_guard_guest() returns trigger language plpgsql set search_path='' security definer as $$
begin
 if (new.guest_requested_by is distinct from old.guest_requested_by and exists(select 1 from public.connect_live_restrictions where live_id=new.id and user_id=new.guest_requested_by and banned)) or (new.guest_id is distinct from old.guest_id and exists(select 1 from public.connect_live_restrictions where live_id=new.id and user_id=new.guest_id and banned)) then raise exception 'Participante banido da live' using errcode='42501';end if;
 return new;
end $$;
revoke all on function public.connect_live_guard_guest() from public,anon,authenticated;
create trigger connect_live_guard_guest before update of guest_requested_by,guest_id on public.entre_lives for each row execute function public.connect_live_guard_guest();
create or replace function public.connect_live_interact(_live uuid, _action text default 'read', _body text default null, _comment uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); l public.entre_lives%rowtype; result jsonb; muted boolean; banned boolean;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501'; end if;
 select * into l from public.entre_lives where id=_live and status='active' and expires_at>now();
 if not found or exists(select 1 from public.entre_moderation where user_id=l.host_id and is_banned) or exists(select 1 from public.entre_blocks where (blocker=me and blocked=l.host_id) or (blocker=l.host_id and blocked=me)) then raise exception 'Live indisponível' using errcode='42501'; end if;
 select exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and banned),exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and muted_until>now()) into banned,muted;
 if banned then return jsonb_build_object('banned',true,'comments_enabled',false,'comments','[]'::jsonb);end if;
 if _action='comment' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text||_live::text,0));
  select * into l from public.entre_lives where id=_live and status='active' and expires_at>now() for share;
  if exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and (banned or muted_until>now())) then raise exception 'Você está silenciado nesta live' using errcode='42501'; end if;
  if not found or not l.comments_enabled then raise exception 'Comentários indisponíveis'; end if;
  _body:=btrim(coalesce(_body,''));
  if char_length(_body) not between 1 and 250 then raise exception 'Mensagem inválida'; end if;
  if exists(select 1 from public.connect_live_comments where live_id=_live and user_id=me and created_at>now()-interval '2 seconds') then raise exception 'Aguarde antes de comentar novamente'; end if;
  insert into public.connect_live_comments(live_id,user_id,body) values(_live,me,_body);
 elsif _action='heart' then
  insert into public.connect_live_hearts(live_id,user_id) values(_live,me)
  on conflict(live_id,user_id) do update set count=least(public.connect_live_hearts.count+1,10000),updated_at=now()
  where public.connect_live_hearts.updated_at<now()-interval '1 second';
 elsif _action='delete' then
  delete from public.connect_live_comments where id=_comment and live_id=_live and (user_id=me or l.host_id=me);
 elsif _action in ('close','open') then
  if l.host_id<>me then raise exception 'Sem permissão' using errcode='42501'; end if;
  update public.entre_lives set comments_enabled=(_action='open') where id=_live returning * into l;
 elsif _action <> 'read' then raise exception 'Ação inválida'; end if;
 select jsonb_build_object('comments_enabled',l.comments_enabled and not muted,'muted',muted,'hearts',coalesce((select sum(count) from public.connect_live_hearts where live_id=_live),0),'comments',
 coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at,c.id) from (
 select m.id,m.user_id,m.body,m.created_at,coalesce(p.display_name,'Pessoa') as name,(m.user_id=me or l.host_id=me) as can_delete
 from public.connect_live_comments m left join public.entre_profiles p on p.id=m.user_id
 where m.live_id=_live and not exists(select 1 from public.connect_live_restrictions r where r.live_id=_live and r.user_id=m.user_id and (r.banned or r.muted_until>now())) and not exists(select 1 from public.entre_blocks b where (b.blocker=me and b.blocked=m.user_id) or (b.blocker=m.user_id and b.blocked=me)) and not exists(select 1 from public.entre_moderation where user_id=m.user_id and is_banned)
 order by m.created_at desc,m.id desc limit 50) c),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.connect_live_interact(uuid,text,text,uuid) from public,anon;
grant execute on function public.connect_live_interact(uuid,text,text,uuid) to authenticated;

