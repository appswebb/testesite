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
  where m.room_key=key and m.deleted_at is null and m.created_at>now()-interval '24 hours'
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

