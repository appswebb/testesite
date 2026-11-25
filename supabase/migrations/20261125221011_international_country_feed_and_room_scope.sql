create function connect_internal.room_scope_allowed(_user uuid,_key text) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from connect_internal.world_preferences w where w.user_id=_user and w.scope='country' and not (case when w.country='BR' then _key='br' or _key ~ '^[sc]:' else _key='n:'||lower(w.country) end));
$$;
revoke all on function connect_internal.room_scope_allowed(uuid,text) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.connect_feed_v2(_before bigint DEFAULT NULL::bigint, _mode text DEFAULT 'recent'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();items jsonb;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 if _mode not in ('recent','following','recommended','trending','region') or _mode is null then raise exception 'Filtro inválido'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',p.id,'body',p.body,'media_path',p.media_path,'media_type',p.media_type,'created_at',p.created_at,'edited_at',p.edited_at,
  'author_id',p.author_id,'author_name',a.display_name,'author_avatar',a.avatar_path,'author_avatar_uploaded_at',a.avatar_uploaded_at,
  'premium',public.entre_premium_active(p.author_id),
  'likes',(select count(*) from public.entre_post_likes l where l.post_id=p.id),
  'liked',(select exists(select 1 from public.entre_post_likes l where l.post_id=p.id and l.user_id=uid)),
  'comments',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'author_id',c.author_id,'name',coalesce(cp.display_name,'Pessoa'),'premium',public.entre_premium_active(c.author_id),'created_at',c.created_at) order by c.created_at),'[]'::jsonb)
    from (select pc.* from public.entre_post_comments pc where pc.post_id=p.id and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=pc.author_id) or (b.blocker=pc.author_id and b.blocked=uid)) and not exists(select 1 from public.entre_moderation m where m.user_id=pc.author_id and m.is_banned) order by pc.created_at desc limit 10) c
    left join public.entre_profiles cp on cp.id=c.author_id)
 ) order by case when _mode='trending' then (select count(*) from public.entre_post_likes l where l.post_id=p.id) else 0 end desc, p.id desc),'[]'::jsonb) into items
 from (select pp.* from public.entre_posts pp join public.entre_profiles pr on pr.id=pp.author_id where connect_internal.world_visible(uid,pp.author_id) and (_before is null or pp.id<_before) and (
 _mode='recent' or (_mode='following' and (pp.author_id=uid or exists(select 1 from public.entre_follows f where f.follower=uid and f.followed=pp.author_id and f.status='accepted')))
 or (_mode='region' and exists(select 1 from connect_internal.world_preferences a join connect_internal.world_preferences b on b.country=a.country where a.user_id=uid and b.user_id=pp.author_id))
 or (_mode='recommended' and (pp.author_id=uid or exists(select 1 from public.connect_discovery_profiles a join public.connect_discovery_profiles b on a.interests && b.interests where a.user_id=uid and b.user_id=pp.author_id and b.visible)))
 or (_mode='trending' and pp.created_at>now()-interval '72 hours')) and not exists(select 1 from public.entre_moderation m where m.user_id=pp.author_id and m.is_banned) and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=pp.author_id) or (b.blocker=pp.author_id and b.blocked=uid)) order by case when _mode='trending' then (select count(*) from public.entre_post_likes l where l.post_id=pp.id) else 0 end desc,pp.id desc limit 15) p join public.entre_profiles a on a.id=p.author_id;
 return items;
end $function$;

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
 if not connect_internal.room_scope_allowed(me,key) then raise exception 'A sala não está disponível no alcance selecionado' using errcode='42501';end if;
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
end $function$;

CREATE OR REPLACE FUNCTION public.entre_room_send(_room text, _body text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=auth.uid(); key text; last_sent timestamptz; inserted bigint; retry_ms integer;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then
  raise exception 'Envio indisponível' using errcode='42501'; end if;
 key:=public.entre_room_key(_room);
 if not connect_internal.room_scope_allowed(me,key) then raise exception 'A sala não está disponível no alcance selecionado' using errcode='42501';end if;
 _body:=btrim(coalesce(_body,''));
 if length(_body)<1 or length(_body)>400 then raise exception 'Use entre 1 e 400 caracteres';end if;
 -- Transaction scoped lock prevents parallel messages evading the cooldown.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text,28711));
 select max(created_at) into last_sent from public.entre_room_messages where sender=me and created_at>now()-interval '5 seconds';
 if last_sent is not null then
  retry_ms:=greatest(1,ceil(extract(epoch from last_sent+interval '5 seconds'-now())*1000)::integer);
  raise exception 'Aguarde 5 segundos antes de enviar outra mensagem (% ms).',retry_ms using errcode='P0001';
 end if;
 insert into public.entre_room_messages(room_key,sender,body) values(key,me,_body) returning id into inserted;
 return jsonb_build_object('id',inserted,'room',key,'cooldown_seconds',5);
end $function$;
