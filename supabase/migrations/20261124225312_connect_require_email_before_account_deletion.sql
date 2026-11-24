create table public.connect_account_delete_verification(
 user_id uuid primary key references auth.users(id) on delete cascade,
 request_session uuid not null,
 email text not null,
 requested_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null
);
alter table public.connect_account_delete_verification enable row level security;
revoke all on public.connect_account_delete_verification from public,anon,authenticated,service_role;
create function public.connect_delete_email_begin() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid; em text; old public.connect_account_delete_verification%rowtype; ts timestamptz:=clock_timestamp();
begin
 if u is null or sid is null or not exists(select 1 from auth.sessions s where s.id=sid and s.user_id=u and (s.not_after is null or s.not_after>ts)) then raise exception 'Sessão inválida' using errcode='42501';end if;
 select email into em from auth.users where id=u and email_confirmed_at is not null and not coalesce(is_anonymous,false) and coalesce(phone,'')='';
 if em is null or not exists(select 1 from public.entre_profiles where id=u) then raise exception 'É necessário um e-mail confirmado e uma conta CONNECT ativa.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,731128));
 select * into old from public.connect_account_delete_verification where user_id=u;
 if old.requested_at>ts-interval '60 seconds' then raise exception 'Aguarde 60 segundos para solicitar outro e-mail.';end if;
 insert into public.connect_account_delete_verification(user_id,request_session,email,requested_at,expires_at) values(u,sid,em,ts,ts+interval '10 minutes')
 on conflict(user_id) do update set request_session=excluded.request_session,email=excluded.email,requested_at=excluded.requested_at,expires_at=excluded.expires_at;
 return jsonb_build_object('email',em,'expires_at',ts+interval '10 minutes');
end $$;
create function public.connect_delete_email_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid; r public.connect_account_delete_verification%rowtype; verified boolean:=false;
begin
 if u is null or sid is null then return jsonb_build_object('pending',false,'verified',false);end if;
 select * into r from public.connect_account_delete_verification where user_id=u and expires_at>now();
 if not found then return jsonb_build_object('pending',false,'verified',false);end if;
 verified:=sid<>r.request_session and exists(
 select 1 from auth.sessions s join auth.mfa_amr_claims a on a.session_id=s.id join auth.users au on au.id=s.user_id
 where s.id=sid and s.user_id=u and s.created_at>=r.requested_at and (s.not_after is null or s.not_after>now())
 and a.authentication_method='otp' and a.created_at>=r.requested_at
 and au.email=r.email and au.email_confirmed_at is not null and coalesce(au.phone,'')='' and not coalesce(au.is_anonymous,false));
 return jsonb_build_object('pending',true,'verified',verified,'expires_at',r.expires_at);
end $$;
create function public.connect_delete_email_cancel() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão inválida' using errcode='42501';end if;
 update public.connect_account_delete_verification set expires_at=least(expires_at,clock_timestamp()) where user_id=auth.uid();
end $$;
create or replace function public.entre_delete_my_profile() returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Sessão inválida' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,731128));
 if not coalesce((public.connect_delete_email_status()->>'verified')::boolean,false) then raise exception 'Confirme seu e-mail antes de excluir sua conta.' using errcode='42501';end if;
 delete from public.connect_account_delete_verification where user_id=u;
 delete from public.entre_queue where user_id=u;
 delete from public.entre_pairs where a=u or b=u;
 delete from public.entre_blocks where blocker=u or blocked=u;
 delete from public.entre_profiles where id=u;
end $$;
revoke all on function public.connect_delete_email_begin(),public.connect_delete_email_status(),public.connect_delete_email_cancel() from public,anon;
grant execute on function public.connect_delete_email_begin(),public.connect_delete_email_status(),public.connect_delete_email_cancel() to authenticated;
revoke all on function public.entre_delete_my_profile() from public,anon;
grant execute on function public.entre_delete_my_profile() to authenticated;

