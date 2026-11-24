create table public.connect_live_staff(live_id uuid references public.entre_lives(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,primary key(live_id,user_id));
create table public.connect_live_stage_guests(live_id uuid references public.entre_lives(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,status text not null check(status in ('pending','approved','invited')),created_at timestamptz not null default now(),primary key(live_id,user_id));
create table public.connect_live_settings(live_id uuid primary key references public.entre_lives(id) on delete cascade,blocked_words text[] not null default '{}',layout text not null default 'grid' check(layout in ('grid','focus')),pinned_comment uuid references public.connect_live_comments(id) on delete set null,guest_enabled boolean not null default true);
create table public.connect_live_matches(id uuid primary key default gen_random_uuid(),live_id uuid not null references public.entre_lives(id) on delete cascade,challenger uuid not null references auth.users(id) on delete cascade,starts_at timestamptz not null default now(),ends_at timestamptz not null,ended boolean not null default false);
create index connect_live_matches_room on public.connect_live_matches(live_id,starts_at desc);
create table public.connect_live_applause(id uuid primary key default gen_random_uuid(),live_id uuid not null references public.entre_lives(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,recipient uuid not null references auth.users(id) on delete cascade,kind text not null check(kind in ('rose','star','fire')),points integer not null check(points in (1,3,5)),match_id uuid references public.connect_live_matches(id) on delete cascade,created_at timestamptz not null default now());
create index connect_live_applause_room on public.connect_live_applause(live_id,created_at desc);
create index connect_live_applause_sender on public.connect_live_applause(live_id,user_id,created_at desc);
alter table public.connect_live_staff enable row level security;
alter table public.connect_live_stage_guests enable row level security;
alter table public.connect_live_settings enable row level security;
alter table public.connect_live_matches enable row level security;
alter table public.connect_live_applause enable row level security;
revoke all on public.connect_live_staff,public.connect_live_stage_guests,public.connect_live_settings,public.connect_live_matches,public.connect_live_applause from public,anon,authenticated;
grant select on public.connect_live_stage_guests,public.connect_live_staff to service_role;
create or replace function public.connect_live_studio(_live uuid,_action text default 'read',_target uuid default null,_value text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); l public.entre_lives%rowtype; host boolean; staff boolean; cfg public.connect_live_settings%rowtype; mt public.connect_live_matches%rowtype; own_status text; result jsonb; pts int; slots int;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 select * into l from public.entre_lives where id=_live and status='active' and expires_at>now();
 if not found or exists(select 1 from public.entre_moderation where user_id=l.host_id and is_banned) or exists(select 1 from public.entre_blocks where (blocker=me and blocked=l.host_id) or (blocker=l.host_id and blocked=me)) or exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and banned) then raise exception 'Live indisponível' using errcode='42501';end if;
 host:=l.host_id=me;staff:=host or exists(select 1 from public.connect_live_staff where live_id=_live and user_id=me);
 if _action<>'read' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_live::text,517));
  select * into l from public.entre_lives where id=_live and status='active' and expires_at>now();
  if not found then raise exception 'Live encerrada';end if;
  if exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and banned) then raise exception 'Acesso indisponível';end if;
  staff:=host or exists(select 1 from public.connect_live_staff where live_id=_live and user_id=me);
 end if;
 insert into public.connect_live_settings(live_id) values(_live) on conflict do nothing;
 select * into cfg from public.connect_live_settings where live_id=_live;
 select count(*)::int into slots from public.connect_live_stage_guests where live_id=_live and status='approved';
 if l.guest_id is not null then slots:=slots+1;end if;
 if _action in ('guest_request','guest_accept') then
  if host or not cfg.guest_enabled then raise exception 'Pedidos indisponíveis';end if;
  if _action='guest_accept' then
   if slots>=3 then raise exception 'Palco cheio';end if;
   update public.connect_live_stage_guests set status='approved' where live_id=_live and user_id=me and status='invited';
   if not found then raise exception 'Convite indisponível';end if;
  else
   if (select count(*) from public.connect_live_stage_guests where live_id=_live and status='pending')>=30 then raise exception 'Fila cheia';end if;
   insert into public.connect_live_stage_guests(live_id,user_id,status) values(_live,me,'pending') on conflict do nothing;
  end if;
 elsif _action='guest_leave' then
  delete from public.connect_live_stage_guests where live_id=_live and user_id=me;
 elsif _action in ('guest_approve','guest_reject','guest_remove','guest_invite','staff_add','staff_remove','layout','guest_toggle','words','pin','unpin','match_start','match_end') then
  if not staff or (not host and _action not in ('words','pin','unpin')) then raise exception 'Sem permissão' using errcode='42501';end if;
  if _action in ('guest_approve','guest_invite','staff_add','match_start') and (_target is null or _target=l.host_id or exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=_target and banned) or exists(select 1 from public.entre_moderation where user_id=_target and is_banned) or exists(select 1 from public.entre_blocks where (blocker=l.host_id and blocked=_target) or (blocker=_target and blocked=l.host_id))) then raise exception 'Participante indisponível';end if;
  case _action
  when 'guest_approve' then
   if slots>=3 then raise exception 'Palco cheio';end if;
   update public.connect_live_stage_guests set status='approved' where live_id=_live and user_id=_target and status='pending';if not found then raise exception 'Pedido indisponível';end if;
  when 'guest_invite' then insert into public.connect_live_stage_guests(live_id,user_id,status) values(_live,_target,'invited') on conflict do nothing;
  when 'guest_reject' then delete from public.connect_live_stage_guests where live_id=_live and user_id=_target and status<>'approved';
  when 'guest_remove' then delete from public.connect_live_stage_guests where live_id=_live and user_id=_target;update public.entre_lives set guest_id=null where id=_live and guest_id=_target;
  when 'staff_add' then insert into public.connect_live_staff values(_live,_target) on conflict do nothing;
  when 'staff_remove' then delete from public.connect_live_staff where live_id=_live and user_id=_target;
  when 'layout' then update public.connect_live_settings set layout=_value where live_id=_live;
  when 'guest_toggle' then update public.connect_live_settings set guest_enabled=not guest_enabled where live_id=_live;
  when 'words' then update public.connect_live_settings set blocked_words=array(select distinct lower(btrim(w)) from unnest(string_to_array(left(coalesce(_value,''),2000),',')) w where char_length(btrim(w)) between 2 and 50 limit 100) where live_id=_live;
  when 'pin' then if not exists(select 1 from public.connect_live_comments where id=_target and live_id=_live) then raise exception 'Comentário indisponível';end if;update public.connect_live_settings set pinned_comment=_target where live_id=_live;
  when 'unpin' then update public.connect_live_settings set pinned_comment=null where live_id=_live;
  when 'match_start' then
   if not exists(select 1 from public.connect_live_stage_guests where live_id=_live and user_id=_target and status='approved') and l.guest_id is distinct from _target then raise exception 'Convide um participante primeiro';end if;
   if exists(select 1 from public.connect_live_matches where live_id=_live and not ended and ends_at>now()) then raise exception 'Já há uma batalha';end if;
   insert into public.connect_live_matches(live_id,challenger,ends_at) values(_live,_target,least(now()+interval '5 minutes',l.expires_at));
  when 'match_end' then update public.connect_live_matches set ended=true,ends_at=least(ends_at,now()) where live_id=_live and not ended and ends_at>now();
  end case;
 elsif _action='gift' then
  if _target is null or _target=me or (_target<>l.host_id and l.guest_id is distinct from _target and not exists(select 1 from public.connect_live_stage_guests where live_id=_live and user_id=_target and status='approved')) then raise exception 'Destinatário indisponível';end if;
  if exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id in(me,_target) and banned) then raise exception 'Interação indisponível';end if;
  if exists(select 1 from public.connect_live_applause where live_id=_live and user_id=me and created_at>now()-interval '3 seconds') then raise exception 'Aguarde antes de reagir novamente';end if;
  pts:=case _value when 'rose' then 1 when 'star' then 3 when 'fire' then 5 else null end;
  if pts is null then raise exception 'Reação inválida';end if;
  select * into mt from public.connect_live_matches where live_id=_live and not ended and ends_at>now() and _target in (l.host_id,challenger) order by starts_at desc limit 1;
  insert into public.connect_live_applause(live_id,user_id,recipient,kind,points,match_id) values(_live,me,_target,_value,pts,mt.id);
 elsif _action<>'read' then raise exception 'Ação inválida';end if;
 select * into cfg from public.connect_live_settings where live_id=_live;
 select * into mt from public.connect_live_matches where live_id=_live order by starts_at desc limit 1;
 select status into own_status from public.connect_live_stage_guests where live_id=_live and user_id=me;
 result:=jsonb_build_object('can_moderate',staff,'host',host,'my_guest',coalesce(own_status,case when l.guest_id=me then 'approved' end),'guest_enabled',cfg.guest_enabled,'layout',cfg.layout,'words',case when staff then cfg.blocked_words else '{}'::text[] end,
 'guests',coalesce((select jsonb_agg(jsonb_build_object('id',g.user_id,'name',coalesce(p.display_name,'Pessoa'),'status',g.status) order by g.created_at) from public.connect_live_stage_guests g left join public.entre_profiles p on p.id=g.user_id where g.live_id=_live and (g.status='approved' or host or g.user_id=me)),'[]'::jsonb),
 'staff',coalesce((select jsonb_agg(user_id) from public.connect_live_staff where live_id=_live),'[]'::jsonb),
 'pinned',(select jsonb_build_object('id',c.id,'body',c.body,'name',coalesce(p.display_name,'Pessoa')) from public.connect_live_comments c left join public.entre_profiles p on p.id=c.user_id where c.id=cfg.pinned_comment and c.live_id=_live and not exists(select 1 from public.entre_blocks where (blocker=me and blocked=c.user_id) or (blocker=c.user_id and blocked=me)) and not exists(select 1 from public.entre_moderation where user_id=c.user_id and is_banned)),
 'match',case when mt.id is not null then jsonb_build_object('id',mt.id,'challenger',mt.challenger,'name',coalesce((select display_name from public.entre_profiles where id=mt.challenger),'Convidado'),'ends_at',mt.ends_at,'active',not mt.ended and mt.ends_at>now(),'host_points',coalesce((select sum(points) from public.connect_live_applause where match_id=mt.id and recipient=l.host_id),0),'guest_points',coalesce((select sum(points) from public.connect_live_applause where match_id=mt.id and recipient=mt.challenger),0)) end,
 'ranking',coalesce((select jsonb_agg(to_jsonb(r) order by r.points desc) from (select coalesce(p.display_name,'Pessoa') name,sum(a.points) points from public.connect_live_applause a left join public.entre_profiles p on p.id=a.user_id where a.live_id=_live and not exists(select 1 from public.entre_blocks where (blocker=me and blocked=a.user_id) or (blocker=a.user_id and blocked=me)) group by a.user_id,p.display_name order by sum(a.points) desc limit 10) r),'[]'::jsonb),
 'recent_gift',(select jsonb_build_object('id',a.id,'kind',a.kind,'name',coalesce(p.display_name,'Pessoa'),'recipient',a.recipient,'created_at',a.created_at) from public.connect_live_applause a left join public.entre_profiles p on p.id=a.user_id where a.live_id=_live and a.created_at>now()-interval '10 seconds' and not exists(select 1 from public.entre_blocks where (blocker=me and blocked=a.user_id) or (blocker=a.user_id and blocked=me)) order by a.created_at desc limit 1));
 return result;
end $$;
revoke all on function public.connect_live_studio(uuid,text,uuid,text) from public,anon;
grant execute on function public.connect_live_studio(uuid,text,uuid,text) to authenticated;
create or replace function public.connect_live_moderate(_live uuid,_target uuid default null,_action text default 'list')
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); l public.entre_lives%rowtype; result jsonb;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 select * into l from public.entre_lives where id=_live and status='active' and expires_at>now();
 if not found or (l.host_id<>me and not exists(select 1 from public.connect_live_staff where live_id=_live and user_id=me)) then raise exception 'Somente o anfitrião pode moderar' using errcode='42501';end if;
 if _action<>'list' then
  if _target is null or _target=me or _target=l.host_id or (l.host_id<>me and exists(select 1 from public.connect_live_staff where live_id=_live and user_id=_target)) then raise exception 'Participante inválido';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_target::text||_live::text,0));
  if _action in ('mute5','mute30','mute_live','ban') then
   insert into public.connect_live_restrictions(live_id,user_id,banned,muted_until)
   values(_live,_target,_action='ban',case _action when 'mute5' then now()+interval '5 minutes' when 'mute30' then now()+interval '30 minutes' when 'mute_live' then l.expires_at else null end)
   on conflict(live_id,user_id) do update set banned=public.connect_live_restrictions.banned or excluded.banned,muted_until=coalesce(excluded.muted_until,public.connect_live_restrictions.muted_until),updated_at=now();
   delete from public.connect_live_comments where live_id=_live and user_id=_target;
   if _action='ban' then delete from public.connect_live_stage_guests where live_id=_live and user_id=_target; delete from public.connect_live_staff where live_id=_live and user_id=_target; update public.entre_lives set guest_id=case when guest_id=_target then null else guest_id end,guest_requested_by=case when guest_requested_by=_target then null else guest_requested_by end where id=_live;end if;
  elsif _action='unmute' then update public.connect_live_restrictions set muted_until=null,updated_at=now() where live_id=_live and user_id=_target;
  elsif _action='unban' then update public.connect_live_restrictions set banned=false,updated_at=now() where live_id=_live and user_id=_target;
  else raise exception 'Ação inválida';end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',r.user_id,'name',coalesce(p.display_name,'Pessoa'),'banned',r.banned,'muted_until',r.muted_until) order by r.updated_at desc),'[]'::jsonb) into result from public.connect_live_restrictions r left join public.entre_profiles p on p.id=r.user_id where r.live_id=_live and (r.banned or r.muted_until>now());
 return result;
end $$;
revoke all on function public.connect_live_moderate(uuid,uuid,text) from public,anon;
grant execute on function public.connect_live_moderate(uuid,uuid,text) to authenticated;
create or replace function public.connect_live_interact(_live uuid, _action text default 'read', _body text default null, _comment uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); l public.entre_lives%rowtype; result jsonb; muted boolean; banned boolean; staff boolean;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501'; end if;
 select * into l from public.entre_lives where id=_live and status='active' and expires_at>now();
 if not found or exists(select 1 from public.entre_moderation where user_id=l.host_id and is_banned) or exists(select 1 from public.entre_blocks where (blocker=me and blocked=l.host_id) or (blocker=l.host_id and blocked=me)) then raise exception 'Live indisponível' using errcode='42501'; end if;
 select exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and banned),exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and muted_until>now()) into banned,muted;
 staff:=l.host_id=me or exists(select 1 from public.connect_live_staff where live_id=_live and user_id=me);
 if banned then return jsonb_build_object('banned',true,'comments_enabled',false,'comments','[]'::jsonb);end if;
 if _action='comment' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text||_live::text,0));
  select * into l from public.entre_lives where id=_live and status='active' and expires_at>now() for share;
  if exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and (banned or muted_until>now())) then raise exception 'Você está silenciado nesta live' using errcode='42501'; end if;
  if not found or not l.comments_enabled then raise exception 'Comentários indisponíveis'; end if;
  _body:=btrim(coalesce(_body,''));
  if exists(select 1 from public.connect_live_settings cfg cross join lateral unnest(cfg.blocked_words) w(term) where cfg.live_id=_live and strpos(lower(_body),w.term)>0) then raise exception 'Comentário contém termo bloqueado';end if;
  if char_length(_body) not between 1 and 250 then raise exception 'Mensagem inválida'; end if;
  if exists(select 1 from public.connect_live_comments where live_id=_live and user_id=me and created_at>now()-interval '2 seconds') then raise exception 'Aguarde antes de comentar novamente'; end if;
  insert into public.connect_live_comments(live_id,user_id,body) values(_live,me,_body);
 elsif _action='heart' then
  insert into public.connect_live_hearts(live_id,user_id) values(_live,me)
  on conflict(live_id,user_id) do update set count=least(public.connect_live_hearts.count+1,10000),updated_at=now()
  where public.connect_live_hearts.updated_at<now()-interval '1 second';
 elsif _action='delete' then
  delete from public.connect_live_comments where id=_comment and live_id=_live and (user_id=me or staff);
 elsif _action in ('close','open') then
  if not staff then raise exception 'Sem permissão' using errcode='42501'; end if;
  update public.entre_lives set comments_enabled=(_action='open') where id=_live returning * into l;
 elsif _action <> 'read' then raise exception 'Ação inválida'; end if;
 select jsonb_build_object('comments_enabled',l.comments_enabled and not muted,'muted',muted,'can_moderate',staff,'hearts',coalesce((select sum(count) from public.connect_live_hearts where live_id=_live),0),'comments',
 coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at,c.id) from (
 select m.id,m.user_id,m.body,m.created_at,coalesce(p.display_name,'Pessoa') as name,(m.user_id=me or staff) as can_delete
 from public.connect_live_comments m left join public.entre_profiles p on p.id=m.user_id
 where m.live_id=_live and not exists(select 1 from public.connect_live_restrictions r where r.live_id=_live and r.user_id=m.user_id and (r.banned or r.muted_until>now())) and not exists(select 1 from public.entre_blocks b where (b.blocker=me and b.blocked=m.user_id) or (b.blocker=m.user_id and b.blocked=me)) and not exists(select 1 from public.entre_moderation where user_id=m.user_id and is_banned)
 order by m.created_at desc,m.id desc limit 50) c),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.connect_live_interact(uuid,text,text,uuid) from public,anon;
grant execute on function public.connect_live_interact(uuid,text,text,uuid) to authenticated;


