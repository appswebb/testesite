
create table connect_internal.ban_history (
 id bigint generated always as identity primary key,
 user_id uuid not null,
 display_name text,
 username text,
 email_hash bytea,
 reason text not null default '',
 banned_at timestamptz not null default now(),
 banned_by uuid,
 released_at timestamptz,
 released_by uuid,
 release_reason text,
 blocked_ip inet,
 ip_released_at timestamptz
);
alter table connect_internal.ban_history enable row level security;
revoke all on connect_internal.ban_history from public,anon,authenticated;
create unique index connect_ban_one_active on connect_internal.ban_history(user_id) where released_at is null;
create index connect_ban_active_ip on connect_internal.ban_history(blocked_ip) where released_at is null and ip_released_at is null;
create index connect_ban_active_email on connect_internal.ban_history(email_hash) where released_at is null;
create function connect_internal.record_ban() returns trigger language plpgsql security definer set search_path='' as $$
declare ip inet; addr text; name text; handle text;
begin
 if new.is_banned then
  if tg_op='UPDATE' and old.is_banned then
   update connect_internal.ban_history set reason=new.reason where user_id=new.user_id and released_at is null;
   return new;
  end if;
  select u.email,p.display_name,p.username into addr,name,handle from auth.users u left join public.entre_profiles p on p.id=u.id where u.id=new.user_id;
  select s.ip into ip from auth.sessions s where s.user_id=new.user_id and s.ip is not null and s.updated_at>now()-interval '30 days' order by s.updated_at desc nulls last,s.created_at desc limit 1;
  if ip is not null then
    ip:=host(ip)::inet;
    if ip <<= '127.0.0.0/8'::inet or ip <<= '10.0.0.0/8'::inet or ip <<= '172.16.0.0/12'::inet or ip <<= '192.168.0.0/16'::inet or ip <<= '100.64.0.0/10'::inet or ip <<= '169.254.0.0/16'::inet or ip <<= '0.0.0.0/8'::inet or ip <<= '::1/128'::inet or ip <<= 'fc00::/7'::inet or ip <<= 'fe80::/10'::inet or ip <<= '::/128'::inet then ip:=null;end if;
  end if;
  insert into connect_internal.ban_history(user_id,display_name,username,email_hash,reason,banned_at,banned_by,blocked_ip)
  values(new.user_id,name,handle,case when addr is not null then sha256(convert_to(lower(trim(addr)),'UTF8')) end,new.reason,new.updated_at,new.updated_by,ip)
  on conflict(user_id) where released_at is null do nothing;
 elsif tg_op='UPDATE' and old.is_banned then
  update connect_internal.ban_history set released_at=now(),released_by=new.updated_by,release_reason='Conta reativada',ip_released_at=coalesce(ip_released_at,now()),blocked_ip=null,email_hash=null where user_id=new.user_id and released_at is null;
 end if;
 return new;
end $$;
revoke all on function connect_internal.record_ban() from public,anon,authenticated;
create trigger connect_record_ban after insert or update of is_banned,reason on public.entre_moderation for each row execute function connect_internal.record_ban();
-- Existing active bans (no account deletion or full log capture).
insert into connect_internal.ban_history(user_id,display_name,username,email_hash,reason,banned_at,banned_by)
select m.user_id,p.display_name,p.username,case when u.email is not null then sha256(convert_to(lower(trim(u.email)),'UTF8')) end,m.reason,m.updated_at,m.updated_by from public.entre_moderation m join auth.users u on u.id=m.user_id left join public.entre_profiles p on p.id=m.user_id where m.is_banned;
create function public.connect_before_user_created(event jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare ip inet; addr text; hashed bytea;
begin
 begin ip:=host(nullif(event->'metadata'->>'ip_address','')::inet)::inet;exception when invalid_text_representation then ip:=null;end;
 addr:=nullif(lower(trim(event->'user'->>'email')),'');
 if addr is not null then hashed:=sha256(convert_to(addr,'UTF8'));end if;
 if exists(select 1 from connect_internal.ban_history h where h.released_at is null and ((hashed is not null and h.email_hash=hashed) or (ip is not null and h.blocked_ip=ip and h.ip_released_at is null))) then
  return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Cadastro indisponível. Entre em contato com o suporte do CONNECT se acreditar que houve um engano.'));
 end if;
 return '{}'::jsonb;
end $$;
revoke all on function public.connect_before_user_created(jsonb) from public,anon,authenticated;
grant execute on function public.connect_before_user_created(jsonb) to supabase_auth_admin;
create function public.connect_admin_ban_history(_limit integer default 50,_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 select jsonb_build_object('total',(select count(*) from connect_internal.ban_history),'active',(select count(*) from connect_internal.ban_history where released_at is null),'rows',coalesce((select jsonb_agg(to_jsonb(x) order by x.banned_at desc,x.id desc) from (select h.id,h.user_id,h.display_name,h.username,h.reason,h.banned_at,h.released_at,h.release_reason,h.blocked_ip is not null and h.ip_released_at is null and h.released_at is null as ip_blocked,h.ip_released_at,h.released_at is null as active,exists(select 1 from auth.users u where u.id=h.user_id) as account_exists from connect_internal.ban_history h order by h.banned_at desc,h.id desc limit least(greatest(coalesce(_limit,50),1),100) offset greatest(coalesce(_offset,0),0)) x),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.connect_admin_ban_history(integer,integer) from public,anon,authenticated;
grant execute on function public.connect_admin_ban_history(integer,integer) to authenticated;
create function public.connect_admin_release_ban(_id bigint,_ip_only boolean,_reason text default '') returns boolean language plpgsql security definer set search_path='' as $$
declare h connect_internal.ban_history%rowtype;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 if _ip_only is null then raise exception 'Ação inválida';end if;
 select * into h from connect_internal.ban_history where id=_id and released_at is null for update;
 if not found then return false;end if;
 if _ip_only then update connect_internal.ban_history set blocked_ip=null,ip_released_at=now() where id=_id;return true;end if;
 if exists(select 1 from auth.users where id=h.user_id) then perform public.entre_admin_set_ban(h.user_id,false,left(coalesce(_reason,''),300));end if;
 update connect_internal.ban_history set released_at=coalesce(released_at,now()),released_by=auth.uid(),release_reason=left(coalesce(_reason,'Reativação'),300),blocked_ip=null,email_hash=null,ip_released_at=coalesce(ip_released_at,now()) where id=_id;
 return true;
end $$;
revoke all on function public.connect_admin_release_ban(bigint,boolean,text) from public,anon,authenticated;
grant execute on function public.connect_admin_release_ban(bigint,boolean,text) to authenticated;
