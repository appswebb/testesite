begin;
alter table public.entre_room_messages add column edited_at timestamptz,add column deleted_at timestamptz;
create function public.entre_room_message_mutate(_room text,_id bigint,_body text,_delete boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); key text; msg public.entre_room_messages%rowtype;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso negado' using errcode='42501';end if;
 key:=public.entre_room_key(_room);
 if _delete is null or (not _delete and length(btrim(coalesce(_body,''))) not between 1 and 400) then raise exception 'Mensagem inválida';end if;
 update public.entre_room_messages set body=case when _delete then 'Mensagem apagada' else btrim(_body) end,edited_at=case when _delete then edited_at else now() end,deleted_at=case when _delete then now() else null end where id=_id and room_key=key and sender=me and deleted_at is null and created_at>now()-interval '24 hours' returning * into msg;
 if not found then raise exception 'Mensagem indisponível' using errcode='42501';end if;
 return to_jsonb(msg);
end $$;
revoke all on function public.entre_room_message_mutate(text,bigint,text,boolean) from public,anon;
grant execute on function public.entre_room_message_mutate(text,bigint,text,boolean) to authenticated;
CREATE OR REPLACE FUNCTION public.entre_room_messages_page(_room text, _before bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=auth.uid(); key text; items jsonb; has_more boolean;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then
  raise exception 'Sala indisponível' using errcode='42501'; end if;
 key:=public.entre_room_key(_room);
 with messages as (
  select m.id,m.body,m.sender,m.created_at,m.edited_at,m.deleted_at,
   coalesce(p.display_name,'Pessoa') display_name,p.username,p.avatar_path,p.avatar_uploaded_at,
   row_number() over(order by m.id desc) rn
  from public.entre_room_messages m
  join public.entre_profiles p on p.id=m.sender
  where m.room_key=key and m.created_at>now()-interval '24 hours'
   and (_before is null or m.id<_before)
   and not exists(select 1 from public.entre_moderation md where md.user_id=m.sender and md.is_banned)
   and not exists(select 1 from public.entre_blocks b where
    (b.blocker=me and b.blocked=m.sender) or (b.blocker=m.sender and b.blocked=me))
  order by m.id desc limit 41
 )
 select coalesce(jsonb_agg(to_jsonb(x)-'rn' order by x.id desc) filter(where x.rn<=40),'[]'::jsonb),
 coalesce(bool_or(x.rn>40),false) into items,has_more from messages x;
 return jsonb_build_object('items',items,'has_more',has_more,'room',key,'ttl_hours',24);
end $function$
;
create or replace function public.entre_room_delete_my_message(_id bigint) returns boolean language plpgsql security definer set search_path='' as $$
declare key text;
begin
 select room_key into key from public.entre_room_messages where id=_id and sender=auth.uid() and deleted_at is null;
 if key is null then return false;end if;
 perform public.entre_room_message_mutate(key,_id,'',true);
 return true;
end $$;
revoke all on function public.entre_room_delete_my_message(bigint) from public,anon;
grant execute on function public.entre_room_delete_my_message(bigint) to authenticated;
create trigger entre_realtime_room_message_update after update on public.entre_room_messages for each statement execute function public.entre_signal_community_change('rooms');
commit;