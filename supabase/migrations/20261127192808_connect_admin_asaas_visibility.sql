CREATE OR REPLACE FUNCTION public.connect_admin_plan_page(_query text DEFAULT ''::text, _plan text DEFAULT 'all'::text, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; q text:=connect_internal.admin_search_normalize(left(coalesce(_query,''),120)); handle text;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501'; end if;
 if coalesce(_plan,'') not in ('all','premium','free','expired','revoked','pending') then raise exception 'Filtro inválido'; end if;
 handle:=ltrim(q,'@');
 with accounts as (
  select u.id,p.display_name,p.username,u.email,u.created_at,
   p.id is not null and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) as manageable,
   p.id is not null as has_profile,u.email_confirmed_at is not null as verified,
   greatest(case when not m.revoked then m.paid_until end,case when a.status='authorized' then a.paid_until end) as paid_until,m.updated_at,m.revoked,
   coalesce(p.id is not null and public.entre_premium_active(p.id),false) as active,
   case when p.id is null then 'no_profile' when u.email_confirmed_at is null then 'unconfirmed' when public.entre_premium_active(p.id) then 'premium' when m.revoked then 'revoked' when m.paid_until is not null or a.paid_until is not null then 'expired' else 'free' end as plan_status
  from auth.users u left join public.entre_profiles p on p.id=u.id
  left join public.connect_manual_premium m on m.user_id=p.id left join public.entre_premium_subscriptions a on a.user_id=p.id and a.provider='asaas'
  where not coalesce(u.is_anonymous,false)
 ), filtered as (
 select * from accounts where (_plan='all' or (_plan='free' and manageable and not active) or (_plan='pending' and not manageable) or plan_status=_plan)
 and (q='' or strpos(connect_internal.admin_search_normalize(email),q)>0 or strpos(connect_internal.admin_search_normalize(display_name),q)>0 or (handle<>'' and strpos(connect_internal.admin_search_normalize(username),handle)>0))
 ), page as (
 select * from filtered order by active desc,created_at desc,id desc limit least(greatest(coalesce(_limit,20),1),50) offset greatest(coalesce(_offset,0),0)
 )
 select jsonb_build_object('counts',(select jsonb_build_object('total',count(*),'premium',count(*) filter(where active),'free',count(*) filter(where manageable and not active),'expired',count(*) filter(where plan_status='expired'),'revoked',count(*) filter(where plan_status='revoked'),'pending',count(*) filter(where not manageable)) from accounts),
 'total',(select count(*) from filtered),'rows',(select coalesce(jsonb_agg(to_jsonb(page) order by active desc,created_at desc,id desc),'[]'::jsonb) from page)) into result;
 return result;
end$function$;
CREATE OR REPLACE FUNCTION public.entre_admin_users(_query text DEFAULT ''::text, _limit integer DEFAULT 30, _offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501'; end if;
 with filtered as (
 select u.id,u.email,u.created_at,u.last_sign_in_at,
 u.email_confirmed_at is not null as verified,
 exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google') as google,
 p.display_name,p.username,p.age,p.gender,
 coalesce(m.is_banned,false) as banned,coalesce(m.reason,'') as ban_reason,
 exists(select 1 from public.entre_admin_allowlist a where a.email=lower(u.email) and a.enabled) as admin,
 p.id is not null as has_connect_profile,
 p.id is not null and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) as plan_manageable,
 case when p.id is null then 'no_profile' when public.entre_premium_active(p.id) then 'premium' when s.revoked then 'revoked' when s.paid_until is not null or a.paid_until is not null then 'expired' else 'free' end as plan_status,
 case when p.id is not null then greatest(case when not s.revoked then s.paid_until end,case when a.status='authorized' then a.paid_until end) end as plan_paid_until
 from auth.users u left join public.entre_profiles p on p.id=u.id left join public.entre_moderation m on m.user_id=u.id left join public.connect_manual_premium s on s.user_id=p.id left join public.entre_premium_subscriptions a on a.user_id=p.id and a.provider='asaas'
 where connect_internal.admin_search_normalize(_query)='' or strpos(connect_internal.admin_search_normalize(u.email),connect_internal.admin_search_normalize(left(_query,120)))>0 or strpos(connect_internal.admin_search_normalize(p.display_name),connect_internal.admin_search_normalize(left(_query,120)))>0 or (ltrim(connect_internal.admin_search_normalize(left(_query,120)),'@')<>'' and strpos(connect_internal.admin_search_normalize(p.username),ltrim(connect_internal.admin_search_normalize(left(_query,120)),'@'))>0)
 ), page as (select * from filtered order by created_at desc,id desc limit least(greatest(coalesce(_limit,30),1),100) offset greatest(coalesce(_offset,0),0))
 select jsonb_build_object('total',(select count(*) from filtered),'rows',(select coalesce(jsonb_agg(to_jsonb(page) order by created_at desc,id desc),'[]'::jsonb) from page)) into result;
 return result;
end; $function$;
create or replace function public.connect_admin_asaas_summary(_email text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare uid uuid; s public.entre_premium_subscriptions%rowtype;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 select id into uid from auth.users where lower(email)=lower(trim(_email));
 if uid is null then return '{}'::jsonb;end if;
 select * into s from public.entre_premium_subscriptions where user_id=uid and provider='asaas';
 return jsonb_build_object('active',coalesce(s.status='authorized' and s.paid_until>now(),false),'paid_until',s.paid_until,'status',s.status,
 'payments',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select status,method,amount_cents,created_at,provider_id from public.connect_asaas_payments where user_id=uid order by created_at desc limit 20)x),'[]'::jsonb),
 'renewals',coalesce((select jsonb_agg(to_jsonb(x) order by x.due_date desc) from (select c.status,c.due_date,c.provider_id,r.amount_cents from public.connect_asaas_recurring_charges c join public.connect_asaas_recurring r on r.id=c.recurring_id where r.user_id=uid order by c.due_date desc limit 20)x),'[]'::jsonb));
end $$;
revoke all on function public.connect_admin_asaas_summary(text) from public,anon;
grant execute on function public.connect_admin_asaas_summary(text) to authenticated;
