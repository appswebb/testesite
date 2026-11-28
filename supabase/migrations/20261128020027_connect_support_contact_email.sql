alter table public.entre_support_tickets add column if not exists contact_email text;
alter table public.entre_support_tickets add constraint entre_support_contact_email_valid check (contact_email is null or (length(contact_email) between 3 and 254 and contact_email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$'));
create function public.entre_support_create(_category text, _subject text, _description text, _contact_email text)
returns bigint language plpgsql security definer set search_path to '' as $$
declare uid uuid:=auth.uid(); tid bigint; contact text:=nullif(btrim(_contact_email),'');
begin
 if uid is null then raise exception 'Faça login' using errcode='42501';end if;
 if contact is null or length(contact)>254 or contact !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$' then raise exception 'Informe um e-mail válido para contato';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,73711));
 tid:=public.entre_support_create(_category,_subject,_description);
 update public.entre_support_tickets set contact_email=contact where id=tid and owner_id=uid and status='draft';
 return tid;
end $$;
revoke all on function public.entre_support_create(text,text,text,text) from public,anon;
grant execute on function public.entre_support_create(text,text,text,text) to authenticated;
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
  'user_id',t.owner_id,'user_email',(select email from auth.users where id=t.owner_id),
  'contact_email',t.contact_email,'contact_verified',exists(select 1 from auth.users u where u.id=t.owner_id and u.email_confirmed_at is not null and lower(u.email)=lower(t.contact_email)),
  'evidence',(select coalesce(jsonb_agg(e.object_path),'[]'::jsonb) from public.entre_support_evidence e where e.ticket_id=t.id)
 ) order by t.id desc),'[]'::jsonb)
 from (select * from public.entre_support_tickets where status<>'draft' order by id desc limit 75) t);
end $function$
;
