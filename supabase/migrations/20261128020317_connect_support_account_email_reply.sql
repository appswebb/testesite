CREATE OR REPLACE FUNCTION public.entre_support_create(_category text, _subject text, _description text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();tid bigint;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Conta indisponível' using errcode='42501';end if;
 _subject:=trim(coalesce(_subject,''));_description:=trim(coalesce(_description,''));
 if _category not in('bug','account','security','other') or length(_subject) not between 5 and 120 or length(_description) not between 20 and 3000 then raise exception 'Confira os dados do chamado';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,73711));
 if (select count(*) from public.entre_support_tickets where owner_id=uid and created_at>now()-interval '24 hours')>=5 then raise exception 'Limite de 5 chamados por dia';end if;
 insert into public.entre_support_tickets(owner_id,category,subject,description) values(uid,_category,_subject,_description) returning id into tid;
 return tid;
end $function$
;
create or replace function public.entre_support_create(_category text,_subject text,_description text,_contact_email text)
returns bigint language sql security invoker set search_path to '' as $$
 select public.entre_support_create(_category,_subject,_description);
$$;
CREATE OR REPLACE FUNCTION public.entre_admin_support_tickets()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.entre_admin_check() then raise exception 'Acesso negado' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(
  'id',t.id,'category',t.category,'subject',t.subject,'description',t.description,'status',t.status,'created_at',t.created_at,
  'email_status',t.email_status,'email_sent_at',t.email_sent_at,
  'user_id',t.owner_id,'user_email',(select email from auth.users where id=t.owner_id and email_confirmed_at is not null),
  'evidence',(select coalesce(jsonb_agg(e.object_path),'[]'::jsonb) from public.entre_support_evidence e where e.ticket_id=t.id)
 ) order by t.id desc),'[]'::jsonb)
 from (select * from public.entre_support_tickets where status<>'draft' order by id desc limit 75) t);
end $function$
;
CREATE OR REPLACE FUNCTION public.entre_support_thread(_ticket bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not exists(select 1 from public.entre_support_tickets t where id=_ticket and status<>'draft' and (owner_id=auth.uid() or public.entre_admin_check())) then raise exception 'Acesso negado' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb) from (select id,from_staff,body,created_at,email_sent_at from public.entre_support_replies where ticket_id=_ticket order by id desc limit 100)x);
end $function$
;
create function public.connect_admin_support_reply(_ticket bigint,_body text,_resolve boolean default false)
returns bigint language plpgsql security definer set search_path to '' as $$
declare reply_id bigint;
begin
 if not public.entre_admin_check() then raise exception 'Acesso negado' using errcode='42501'; end if;
 perform public.entre_support_reply(_ticket,_body,_resolve);
 select id into reply_id from public.entre_support_replies where ticket_id=_ticket and author_id=auth.uid() and from_staff order by id desc limit 1;
 if reply_id is null then raise exception 'Resposta não registrada'; end if;
 return reply_id;
end $$;
revoke all on function public.connect_admin_support_reply(bigint,text,boolean) from public,anon;
grant execute on function public.connect_admin_support_reply(bigint,text,boolean) to authenticated;
