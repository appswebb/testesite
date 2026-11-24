create table public.connect_manual_premium(
 user_id uuid primary key references auth.users(id) on delete cascade,
 paid_until timestamptz not null, revoked boolean not null default false,
 updated_at timestamptz not null default now(), updated_by uuid
);
alter table public.connect_manual_premium enable row level security;
revoke all on public.connect_manual_premium from public,anon,authenticated,service_role;
create table public.connect_manual_premium_audit(
 id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade,
 admin_id uuid not null, action text not null check(action in ('grant','revoke')), months integer, paid_until timestamptz not null, created_at timestamptz not null default now()
);
alter table public.connect_manual_premium_audit enable row level security;
revoke all on public.connect_manual_premium_audit from public,anon,authenticated,service_role;
update public.entre_premium_settings set enabled=false,recurring_enabled=false,asaas_recurring_enabled=false,updated_at=now() where id=1;
alter table public.entre_premium_settings add constraint connect_manual_only check(not enabled and not recurring_enabled and not asaas_recurring_enabled);
create or replace function public.entre_premium_active(_uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.connect_manual_premium s where s.user_id=_uid and not s.revoked and s.paid_until>now());
$$;
create or replace function public.entre_premium_badges(_ids uuid[]) returns uuid[] language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or coalesce(cardinality(_ids),0)>120 then raise exception 'Lista indisponível' using errcode='42501';end if;
 return array(select s.user_id from public.connect_manual_premium s where s.user_id=any(coalesce(_ids,array[]::uuid[])) and not s.revoked and s.paid_until>now());
end $$;
create or replace function public.entre_premium_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); m public.connect_manual_premium%rowtype;
begin
 if uid is null then raise exception 'Faça login para continuar' using errcode='42501';end if;
 select * into m from public.connect_manual_premium where user_id=uid;
 return jsonb_build_object('active',public.entre_premium_active(uid),'status',case when m.revoked then 'cancelled' when m.paid_until>now() then 'authorized' when m.paid_until is not null then 'expired' else 'inactive' end,'paid_until',m.paid_until,'price_cents',(select monthly_price_cents from public.entre_premium_settings where id=1),'checkout_enabled',false,'purchase_whatsapp','https://wa.me/5518988234267','manual_only',true);
end $$;
create or replace function public.entre_premium_whatsapp() returns text language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Faça login' using errcode='42501';end if;
 return 'https://wa.me/5518988234267';
end $$;
create or replace function public.entre_admin_premium_config(_price_cents integer,_enabled boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 if _price_cents is null or _price_cents<100 or _price_cents>1000000 then raise exception 'Valor fora da faixa permitida';end if;
 update public.entre_premium_settings set monthly_price_cents=_price_cents,enabled=false,recurring_enabled=false,asaas_recurring_enabled=false,updated_at=now() where id=1;
 return jsonb_build_object('price_cents',_price_cents,'enabled',false,'manual_only',true);
end $$;
create or replace function public.entre_admin_premium_recurring_toggle(_enabled boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 return jsonb_build_object('recurring_enabled',false);
end $$;
create function public.connect_admin_manual_premium(_email text,_action text default 'lookup',_months integer default 1) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; profile_name text; normalized text:=lower(btrim(coalesce(_email,''))); m public.connect_manual_premium%rowtype; expiry timestamptz;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 if char_length(normalized)<3 or char_length(normalized)>254 or normalized not like '%@%' or _action is null or _action not in ('lookup','grant','revoke') then raise exception 'E-mail ou ação inválida';end if;
 select u.id,p.display_name into uid,profile_name from auth.users u join public.entre_profiles p on p.id=u.id where lower(u.email)=normalized and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false);
 if uid is null then raise exception 'Conta com e-mail confirmado e perfil não encontrada';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,913821));
 select * into m from public.connect_manual_premium where user_id=uid;
 if _action='grant' then
  if _months is null or _months not between 1 and 12 then raise exception 'Escolha de 1 a 12 meses';end if;
  expiry:=case when m.revoked is false and m.paid_until>now() then m.paid_until else now() end+make_interval(months=>_months);
  insert into public.connect_manual_premium(user_id,paid_until,revoked,updated_by) values(uid,expiry,false,auth.uid()) on conflict(user_id) do update set paid_until=excluded.paid_until,revoked=false,updated_at=now(),updated_by=excluded.updated_by;
  insert into public.connect_manual_premium_audit(user_id,admin_id,action,months,paid_until) values(uid,auth.uid(),'grant',_months,expiry);
 elsif _action='revoke' and m.user_id is not null and not m.revoked then
  update public.connect_manual_premium set revoked=true,updated_at=now(),updated_by=auth.uid() where user_id=uid;
  insert into public.connect_manual_premium_audit(user_id,admin_id,action,paid_until) values(uid,auth.uid(),'revoke',m.paid_until);
 end if;
 select * into m from public.connect_manual_premium where user_id=uid;
 return jsonb_build_object('email',normalized,'display_name',profile_name,'active',public.entre_premium_active(uid),'paid_until',m.paid_until,'revoked',coalesce(m.revoked,false));
end $$;
revoke all on function public.connect_admin_manual_premium(text,text,integer) from public,anon;
grant execute on function public.connect_admin_manual_premium(text,text,integer) to authenticated;
-- Ensure old legacy payment RPCs cannot enable a manual entitlement.

