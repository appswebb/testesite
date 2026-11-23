-- Images and videos for feed posts, without making the Storage bucket public.
alter table public.entre_posts add column if not exists media_path text;
alter table public.entre_posts add column if not exists media_type text;
alter table public.entre_posts drop constraint if exists entre_posts_media_pair_check;
alter table public.entre_posts add constraint entre_posts_media_pair_check
check ((media_path is null and media_type is null) or
 (media_type='image' and media_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$') or
 (media_type='video' and media_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|webm)$'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('entre-post-media','entre-post-media',false,26214400,array['image/webp','video/mp4','video/webm']::text[])
on conflict(id) do update set public=false,file_size_limit=26214400,
 allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists entre_post_media_insert_own on storage.objects;
create policy entre_post_media_insert_own on storage.objects for insert to authenticated
with check(
 bucket_id='entre-post-media'
 and (storage.foldername(name))[1]=auth.uid()::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|mp4|webm)$'
 and not public.entre_is_banned() and not public.entre_maintenance_active()
);
drop policy if exists entre_post_media_read_visible on storage.objects;
create policy entre_post_media_read_visible on storage.objects for select to authenticated
using(
 bucket_id='entre-post-media'
 and not public.entre_is_banned() and not public.entre_maintenance_active()
 and (
  (storage.foldername(name))[1]=auth.uid()::text
  or exists(
   select 1 from public.entre_posts p
   where p.media_path=name
   and not exists(select 1 from public.entre_moderation m where m.user_id=p.author_id and m.is_banned)
   and not exists(select 1 from public.entre_blocks b
     where (b.blocker=auth.uid() and b.blocked=p.author_id)
     or (b.blocker=p.author_id and b.blocked=auth.uid()))
  )
 )
);
drop policy if exists entre_post_media_delete_own on storage.objects;
create policy entre_post_media_delete_own on storage.objects for delete to authenticated
using(bucket_id='entre-post-media' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.entre_post_create_media(_body text,_media_path text,_media_type text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=auth.uid();p_id bigint; mime text;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then
  raise exception 'Acesso indisponível' using errcode='42501';end if;
 _body:=btrim(coalesce(_body,''));
 if length(_body)>900 then raise exception 'Máximo de 900 caracteres';end if;
 if _media_path is null or _media_type not in ('image','video') then raise exception 'Selecione uma foto ou um vídeo';end if;
 if _media_path !~ ('^'||uid::text||'/[0-9a-f-]{36}\.(webp|mp4|webm)$') then
  raise exception 'Arquivo inválido' using errcode='42501';end if;
 if _media_type='image' and _media_path !~ '\.webp$' or
    _media_type='video' and _media_path !~ '\.(mp4|webm)$' then raise exception 'Formato inválido';end if;
 select coalesce(o.metadata->>'mimetype','') into mime
 from storage.objects o where o.bucket_id='entre-post-media' and o.name=_media_path;
 if mime is null or
  (_media_type='image' and mime<>'image/webp') or
  (_media_type='video' and mime not in ('video/mp4','video/webm')) then
  raise exception 'Arquivo não disponível no armazenamento';end if;
 if (select count(*) from public.entre_posts where author_id=uid and created_at>now()-interval '24 hours')>=15 then raise exception 'Limite de 15 posts por dia';end if;
 insert into public.entre_posts(author_id,body,media_path,media_type)
 values(uid,_body,_media_path,_media_type) returning id into p_id;
 return jsonb_build_object('id',p_id,'status','published');
end $$;
revoke all on function public.entre_post_create_media(text,text,text) from public,anon;
grant execute on function public.entre_post_create_media(text,text,text) to authenticated;

create or replace function public.entre_posts_feed(_before bigint default null)
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare uid uuid:=auth.uid();items jsonb;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',p.id,'body',p.body,'media_path',p.media_path,'media_type',p.media_type,'created_at',p.created_at,
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
end $$;
revoke all on function public.entre_posts_feed(bigint) from public,anon;
grant execute on function public.entre_posts_feed(bigint) to authenticated;
