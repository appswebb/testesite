-- Restore Asaas purchases alongside manual entitlements; keep legacy recurring provider disabled.
alter table public.entre_premium_settings drop constraint if exists connect_manual_only;
alter table public.entre_premium_settings add constraint connect_asaas_only check (not recurring_enabled and (not asaas_recurring_enabled or enabled));
create or replace function public.entre_premium_active(_uid uuid)
returns boolean language sql stable security definer set search_path to '' as $$
 select exists(select 1 from public.connect_manual_premium s where s.user_id=_uid and not s.revoked and s.paid_until>now())
 or exists(select 1 from public.entre_premium_subscriptions s where s.user_id=_uid and s.provider='asaas' and s.status='authorized' and s.paid_until>now());
$$;
create or replace function public.entre_premium_overview()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare uid uuid:=auth.uid(); m public.connect_manual_premium%rowtype; s public.entre_premium_subscriptions%rowtype; expiry timestamptz; active boolean; cfg public.entre_premium_settings%rowtype;
begin
 if uid is null then raise exception 'Faça login para continuar' using errcode='42501';end if;
 select * into m from public.connect_manual_premium where user_id=uid;
 select * into s from public.entre_premium_subscriptions where user_id=uid and provider='asaas';
 select * into cfg from public.entre_premium_settings where id=1;
 expiry:=greatest(case when not m.revoked then m.paid_until end,case when s.status='authorized' then s.paid_until end);
 active:=public.entre_premium_active(uid);
 return jsonb_build_object('active',active,'status',case when active then 'authorized' when m.revoked or s.status='cancelled' then 'cancelled' when expiry is not null then 'expired' else 'inactive' end,'paid_until',expiry,'price_cents',cfg.monthly_price_cents,'checkout_enabled',coalesce(cfg.enabled,false),'manual_only',false);
end $$;
create or replace function public.entre_premium_badges(_ids uuid[])
returns uuid[] language plpgsql stable security definer set search_path to '' as $$
begin
 if auth.uid() is null or coalesce(cardinality(_ids),0)>120 then raise exception 'Lista indisponível' using errcode='42501';end if;
 return array(select distinct id from unnest(coalesce(_ids,array[]::uuid[])) as t(id) where public.entre_premium_active(id));
end $$;
create or replace function public.entre_admin_premium_config(_price_cents integer,_enabled boolean default false)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare cfg public.entre_premium_settings%rowtype;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 if _price_cents is null or _price_cents<100 or _price_cents>1000000 then raise exception 'Valor fora da faixa permitida';end if;
 update public.entre_premium_settings set monthly_price_cents=_price_cents,updated_at=now() where id=1 returning * into cfg;
 return jsonb_build_object('price_cents',cfg.monthly_price_cents,'enabled',cfg.enabled,'asaas_recurring_enabled',cfg.asaas_recurring_enabled,'manual_only',false);
end $$;
update public.entre_premium_settings set enabled=true,asaas_recurring_enabled=true,recurring_enabled=false,updated_at=now() where id=1;
