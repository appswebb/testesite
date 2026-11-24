begin;
alter table public.entre_support_tickets drop constraint entre_support_tickets_status_check;
alter table public.entre_support_tickets add constraint entre_support_tickets_status_check check(status in ('draft','submitted','reviewing','resolved','cancelled'));
create or replace function public.connect_support_cancel(_ticket bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();begin
 if me is null then raise exception 'Sessão inválida' using errcode='42501';end if;
 update public.entre_support_tickets set status='cancelled' where id=_ticket and owner_id=me and status in ('submitted','reviewing');
 if not found then raise exception 'Protocolo não disponível para cancelamento' using errcode='42501';end if;
 return true;
end $$;
revoke all on function public.connect_support_cancel(bigint) from public,anon;
grant execute on function public.connect_support_cancel(bigint) to authenticated;
CREATE OR REPLACE FUNCTION public.entre_support_reply(_ticket bigint, _body text, _resolve boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=auth.uid(); staff boolean:=public.entre_admin_check(); t public.entre_support_tickets%rowtype;
begin
 if me is null or public.entre_is_banned() then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into t from public.entre_support_tickets where id=_ticket for update;
 if not found or t.status in ('draft','cancelled') or (not staff and t.owner_id<>me) then raise exception 'Acesso negado' using errcode='42501';end if;
 if length(trim(coalesce(_body,''))) not between 1 and 4000 then raise exception 'Resposta inválida';end if;
 if (select count(*) from public.entre_support_replies where author_id=me and created_at>now()-interval '1 minute')>=10 then raise exception 'Aguarde antes de responder';end if;
 insert into public.entre_support_replies(ticket_id,author_id,from_staff,body) values(_ticket,me,staff,trim(_body));
 update public.entre_support_tickets set status=case when staff and _resolve then 'resolved' when staff then 'reviewing' else 'submitted' end where id=_ticket;
end $function$
;
commit;