CREATE OR REPLACE FUNCTION public.entre_post_comment(_post bigint, _body text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();cid bigint;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 _body:=trim(coalesce(_body,''));
 if length(_body) not between 2 and 420 then raise exception 'Comentário entre 2 e 420 caracteres';end if;
 if not exists(select 1 from public.entre_posts p where p.id=_post and not exists(select 1 from public.entre_moderation m where m.user_id=p.author_id and m.is_banned) and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=p.author_id) or (b.blocker=p.author_id and b.blocked=uid))) then raise exception 'Post indisponível' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,961234));
 if (select count(*) from public.entre_post_comments where author_id=uid and created_at>now()-interval '1 hour')>=40 then raise exception 'Limite de comentários por hora';end if;
 insert into public.entre_post_comments(post_id,author_id,body) values(_post,uid,_body) returning id into cid;
 return jsonb_build_object('id',cid,'status','posted');
end $function$
;
CREATE OR REPLACE FUNCTION public.entre_post_like(_post bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();liked boolean;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 if not exists(select 1 from public.entre_posts p where p.id=_post and not exists(select 1 from public.entre_moderation m where m.user_id=p.author_id and m.is_banned) and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=p.author_id) or (b.blocker=p.author_id and b.blocked=uid))) then raise exception 'Post indisponível' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text||':'||_post::text,961235));
 delete from public.entre_post_likes where post_id=_post and user_id=uid;
 if found then liked:=false;
 else insert into public.entre_post_likes(post_id,user_id) values(_post,uid) on conflict do nothing;liked:=true;end if;
 return jsonb_build_object('liked',liked);
end $function$
;
CREATE OR REPLACE FUNCTION public.entre_posts_feed(_before bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();items jsonb;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',p.id,'body',p.body,'media_path',p.media_path,'media_type',p.media_type,'created_at',p.created_at,'edited_at',p.edited_at,
  'author_id',p.author_id,'author_name',a.display_name,'author_avatar',a.avatar_path,'author_avatar_uploaded_at',a.avatar_uploaded_at,
  'premium',public.entre_premium_active(p.author_id),
  'likes',(select count(*) from public.entre_post_likes l where l.post_id=p.id),
  'liked',(select exists(select 1 from public.entre_post_likes l where l.post_id=p.id and l.user_id=uid)),
  'comments',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'author_id',c.author_id,'name',coalesce(cp.display_name,'Pessoa'),'premium',public.entre_premium_active(c.author_id),'created_at',c.created_at) order by c.created_at),'[]'::jsonb)
    from (select pc.* from public.entre_post_comments pc where pc.post_id=p.id and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=pc.author_id) or (b.blocker=pc.author_id and b.blocked=uid)) and not exists(select 1 from public.entre_moderation m where m.user_id=pc.author_id and m.is_banned) order by pc.created_at desc limit 10) c
    left join public.entre_profiles cp on cp.id=c.author_id)
 ) order by p.id desc),'[]'::jsonb) into items
 from (select pp.* from public.entre_posts pp join public.entre_profiles pr on pr.id=pp.author_id where (_before is null or pp.id<_before) and not exists(select 1 from public.entre_moderation m where m.user_id=pp.author_id and m.is_banned) and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=pp.author_id) or (b.blocker=pp.author_id and b.blocked=uid)) order by pp.id desc limit 15) p join public.entre_profiles a on a.id=p.author_id;
 return items;
end $function$
;
