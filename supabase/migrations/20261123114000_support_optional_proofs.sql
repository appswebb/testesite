-- Support file attachments can be omitted. Keep private evidence upload checks.
grant select on public.entre_support_tickets to authenticated;
drop policy if exists entre_support_tickets_read_own on public.entre_support_tickets;
create policy entre_support_tickets_read_own on public.entre_support_tickets
 for select to authenticated using (owner_id=(select auth.uid()));
create or replace function public.entre_support_submit(_ticket bigint,_paths text[])
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=auth.uid();path text;item_count integer;ticket_status text;
begin
 if uid is null or public.entre_is_banned() then raise exception 'Acesso negado' using errcode='42501';end if;
 select status into ticket_status from public.entre_support_tickets
  where id=_ticket and owner_id=uid and created_at>now()-interval '30 minutes' for update;
 if ticket_status is distinct from 'draft' then raise exception 'Chamado indisponível';end if;
 item_count:=coalesce(array_length(_paths,1),0);
 if item_count>3 then raise exception 'No máximo 3 arquivos';end if;
 if (select count(distinct item) from unnest(_paths) item)<>item_count then raise exception 'Arquivos repetidos';end if;
 if item_count>0 then
  foreach path in array _paths loop
   if path not like uid::text||'/'||_ticket::text||'/%'
    or not exists(select 1 from storage.objects where bucket_id='entre-support-evidence' and name=path)
    then raise exception 'Uma prova está ausente ou não pertence a este chamado';end if;
   insert into public.entre_support_evidence(ticket_id,object_path) values(_ticket,path);
  end loop;
 end if;
 update public.entre_support_tickets set status='submitted',submitted_at=now() where id=_ticket;
 return jsonb_build_object('id',_ticket,'status','submitted','evidence_count',item_count);
end; $$;
revoke all on function public.entre_support_submit(bigint,text[]) from public,anon;
grant execute on function public.entre_support_submit(bigint,text[]) to authenticated;
