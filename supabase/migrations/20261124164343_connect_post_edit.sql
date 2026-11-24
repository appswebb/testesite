begin;
alter table public.entre_posts add column if not exists edited_at timestamptz;
create or replace function public.connect_post_edit(_post bigint,_body text) returns boolean language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso negado' using errcode='42501';end if;
 _body:=btrim(coalesce(_body,''));
 update public.entre_posts set body=_body,edited_at=now() where id=_post and author_id=me and length(_body)<=900 and (length(_body)>=3 or (media_path is not null and length(_body)=0));
 if not found then raise exception 'Publicação indisponível ou texto inválido' using errcode='42501';end if;
 return true;
end $$;
revoke all on function public.connect_post_edit(bigint,text) from public,anon;
grant execute on function public.connect_post_edit(bigint,text) to authenticated;
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
    from (select * from public.entre_post_comments where post_id=p.id order by created_at desc limit 10) c
    left join public.entre_profiles cp on cp.id=c.author_id)
 ) order by p.id desc),'[]'::jsonb) into items
 from (select * from public.entre_posts where (_before is null or id<_before) order by id desc limit 15) p
 join public.entre_profiles a on a.id=p.author_id
 where not exists(select 1 from public.entre_moderation m where m.user_id=p.author_id and m.is_banned)
 and not exists(select 1 from public.entre_blocks b where
 (b.blocker=uid and b.blocked=p.author_id) or (b.blocker=p.author_id and b.blocked=uid));
 return items;
end $function$
;
commit;