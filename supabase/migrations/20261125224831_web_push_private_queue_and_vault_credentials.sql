
do $$begin
 if not exists(select 1 from vault.secrets where name='connect_push_worker_token') then
 perform vault.create_secret(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'connect_push_worker_token','Internal Web Push worker authentication');
 end if;
end$$;
create table connect_internal.push_devices(
 endpoint text primary key check(length(endpoint)<=2048),
 user_id uuid not null references auth.users(id) on delete cascade,
 p256dh text not null check(p256dh~'^[A-Za-z0-9_-]{87}$'),
 auth_key text not null check(auth_key~'^[A-Za-z0-9_-]{22}$'),
 updated_at timestamptz not null default now(),
 pending_at timestamptz, lease_id uuid, lease_until timestamptz,
 last_sent_at timestamptz, next_try timestamptz not null default now(), failures integer not null default 0
);
alter table connect_internal.push_devices enable row level security;
revoke all on connect_internal.push_devices from public,anon,authenticated;
create index connect_push_user_idx on connect_internal.push_devices(user_id);
create index connect_push_pending_idx on connect_internal.push_devices(next_try,pending_at) where pending_at is not null;
create function public.connect_push_public_key() returns text language sql stable security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='connect_push_vapid_public' and auth.uid() is not null and not public.entre_is_banned() and not public.entre_maintenance_active() limit 1;
$$;
create function public.connect_push_register(_endpoint text,_p256dh text,_auth text) returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or public.entre_is_banned() or public.entre_maintenance_active() or not exists(select 1 from public.entre_profiles where id=u and onboarding_plan_selected) then raise exception 'Acesso indisponível';end if;
 if _endpoint is null or length(_endpoint)>2048 or _endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com)/[^[:space:]#]+$' or _p256dh is null or _p256dh!~'^[A-Za-z0-9_-]{87}$' or _auth is null or _auth!~'^[A-Za-z0-9_-]{22}$' then raise exception 'Dispositivo incompatível';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,88901));
 if (select count(*) from connect_internal.push_devices where user_id=u and endpoint<>_endpoint)>=5 then raise exception 'Limite de cinco dispositivos';end if;
 insert into connect_internal.push_devices(endpoint,user_id,p256dh,auth_key) values(_endpoint,u,_p256dh,_auth)
 on conflict(endpoint) do update set user_id=u,p256dh=excluded.p256dh,auth_key=excluded.auth_key,updated_at=now(),pending_at=null,lease_id=null,lease_until=null,failures=0,next_try=now()
 where connect_internal.push_devices.user_id=u or connect_internal.push_devices.auth_key=excluded.auth_key;
 return found;
end$$;
create function public.connect_push_remove(_endpoint text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return false;end if;
 delete from connect_internal.push_devices where endpoint=_endpoint and user_id=auth.uid();
 return true;
end$$;
create function public.connect_push_device_active(_endpoint text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from connect_internal.push_devices where endpoint=_endpoint and user_id=auth.uid());
$$;
revoke all on function public.connect_push_public_key(),public.connect_push_register(text,text,text),public.connect_push_remove(text),public.connect_push_device_active(text) from public,anon,authenticated;
grant execute on function public.connect_push_public_key(),public.connect_push_register(text,text,text),public.connect_push_remove(text),public.connect_push_device_active(text) to authenticated;
create function connect_internal.push_mark() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind in ('message','chat_request','chat_accepted','follow','follow_accepted','account_suspended','account_restored') then
 update connect_internal.push_devices set pending_at=now() where user_id=new.user_id;
 end if;return new;
end$$;
revoke all on function connect_internal.push_mark() from public,anon,authenticated;
create trigger connect_push_notification after insert on public.entre_notifications for each row execute function connect_internal.push_mark();
create function connect_internal.push_worker_allowed(_token text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select decrypted_secret=_token from vault.decrypted_secrets where name='connect_push_worker_token' limit 1),false);
$$;
revoke all on function connect_internal.push_worker_allowed(text) from public,anon,authenticated;
create function public.connect_push_worker_config(_token text,_public_key text default null,_private_key text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare pub text; priv text;
begin
 if not connect_internal.push_worker_allowed(_token) then raise exception 'Forbidden' using errcode='42501';end if;
 perform pg_advisory_xact_lock(88902);
 select decrypted_secret into pub from vault.decrypted_secrets where name='connect_push_vapid_public';
 select decrypted_secret into priv from vault.decrypted_secrets where name='connect_push_vapid_private';
 if pub is null and priv is null and _public_key~'^[A-Za-z0-9_-]{87}$' and _private_key~'^[A-Za-z0-9_-]{43}$' then
 perform vault.create_secret(_public_key,'connect_push_vapid_public');
 perform vault.create_secret(_private_key,'connect_push_vapid_private');
 pub:=_public_key;priv:=_private_key;
 end if;
 return jsonb_build_object('public_key',pub,'private_key',priv);
end$$;
create function public.connect_push_claim(_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not connect_internal.push_worker_allowed(_token) then raise exception 'Forbidden' using errcode='42501';end if;
 delete from connect_internal.push_devices where updated_at<now()-interval '90 days';
 update connect_internal.push_devices set pending_at=null where pending_at<now()-interval '24 hours';
 with due as (select d.endpoint from connect_internal.push_devices d where d.pending_at is not null and d.next_try<=now() and (d.lease_until is null or d.lease_until<now()) and (d.last_sent_at is null or d.last_sent_at<now()-interval '60 seconds') order by d.pending_at limit 20 for update skip locked),
 claimed as (update connect_internal.push_devices d set lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes' from due where d.endpoint=due.endpoint returning d.endpoint,d.p256dh,d.auth_key,d.lease_id,d.pending_at)
 select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into result from claimed;
 return result;
end$$;
create function public.connect_push_complete(_token text,_endpoint text,_lease uuid,_pending timestamptz,_outcome text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not connect_internal.push_worker_allowed(_token) then raise exception 'Forbidden' using errcode='42501';end if;
 if _outcome='gone' then delete from connect_internal.push_devices where endpoint=_endpoint and lease_id=_lease;
 elsif _outcome='sent' then update connect_internal.push_devices set last_sent_at=now(),pending_at=case when pending_at<=_pending then null else pending_at end,lease_id=null,lease_until=null,failures=0,next_try=now() where endpoint=_endpoint and lease_id=_lease;
 elsif _outcome='retry' then update connect_internal.push_devices set pending_at=case when failures>=4 and pending_at<=_pending then null else pending_at end,lease_id=null,lease_until=null,failures=least(5,failures+1),next_try=now()+interval '5 minutes' where endpoint=_endpoint and lease_id=_lease;
 else raise exception 'Invalid result';end if;
 return true;
end$$;
revoke all on function public.connect_push_worker_config(text,text,text),public.connect_push_claim(text),public.connect_push_complete(text,text,uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.connect_push_worker_config(text,text,text),public.connect_push_claim(text),public.connect_push_complete(text,text,uuid,timestamptz,text) to service_role;
