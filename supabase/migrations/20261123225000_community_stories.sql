-- Ephemeral community stories. Private media, blocked-user isolation, 24h visibility.
create table if not exists public.entre_stories(
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 media_path text not null unique,
 media_type text not null check(media_type in ('image','video')),
 caption text not null default '' check(char_length(caption)<=180),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours',
 check(media_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|mp4|webm)$')
);
create index if not exists entre_stories_active on public.entre_stories(expires_at desc,created_at desc);
alter table public.entre_stories enable row level security;
revoke all on public.entre_stories from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('entre-story-media','entre-story-media',false,26214400,array['image/webp','video/mp4','video/webm']::text[])
on conflict(id) do update set public=false,file_size_limit=26214400,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists entre_story_media_upload on storage.objects;
create policy entre_story_media_upload on storage.objects for insert to authenticated
with check(bucket_id='entre-story-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|mp4|webm)$'
 and not public.entre_is_banned() and not public.entre_maintenance_active());
drop policy if exists entre_story_media_view on storage.objects;
create policy entre_story_media_view on storage.objects for select to authenticated
using(bucket_id='entre-story-media' and not public.entre_is_banned()
 and ( (storage.foldername(name))[1]=(select auth.uid())::text
 or exists(select 1 from public.entre_stories s where s.media_path=name and s.expires_at>now()
   and not exists(select 1 from public.entre_moderation m where m.user_id=s.author_id and m.is_banned)
   and not exists(select 1 from public.entre_blocks b where
     (b.blocker=auth.uid() and b.blocked=s.author_id) or (b.blocker=s.author_id and b.blocked=auth.uid()))) ));
drop policy if exists entre_story_media_remove on storage.objects;
create policy entre_story_media_remove on storage.objects for delete to authenticated
using(bucket_id='entre-story-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create or replace function public.entre_stories_list()
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare uid uuid:=auth.uid(); result jsonb;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then
  raise exception 'Acesso indisponível' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result
 from (select s.id,s.author_id,s.media_path,s.media_type,s.caption,s.created_at,
  coalesce(p.display_name,'Pessoa') author_name
  from public.entre_stories s join public.entre_profiles p on p.id=s.author_id
  where s.expires_at>now() and not exists(select 1 from public.entre_moderation m where m.user_id=s.author_id and m.is_banned)
  and not exists(select 1 from public.entre_blocks b where
    (b.blocker=uid and b.blocked=s.author_id) or (b.blocker=s.author_id and b.blocked=uid))
  order by s.created_at desc limit 100) x;
 return result;
end $$;
revoke all on function public.entre_stories_list() from public,anon;
grant execute on function public.entre_stories_list() to authenticated;
create or replace function public.entre_story_create(_path text,_type text,_caption text default '')
returns uuid language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=auth.uid(); story_id uuid; mime text;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 if _path !~ ('^'||uid::text||'/[0-9a-f-]{36}\.(webp|mp4|webm)$') or _type not in ('image','video') then raise exception 'Arquivo inválido';end if;
 if (_type='image' and _path !~ '\.webp$') or (_type='video' and _path !~ '\.(mp4|webm)$') then raise exception 'Formato inválido';end if;
 if length(coalesce(_caption,''))>180 then raise exception 'Legenda longa demais';end if;
 if (select count(*) from public.entre_stories where author_id=uid and created_at>now()-interval '24 hours')>=20 then raise exception 'Limite de 20 stories por dia';end if;
 select metadata->>'mimetype' into mime from storage.objects where bucket_id='entre-story-media' and name=_path;
 if (_type='image' and mime<>'image/webp') or (_type='video' and mime not in ('video/mp4','video/webm')) or mime is null then raise exception 'Mídia indisponível';end if;
 insert into public.entre_stories(author_id,media_path,media_type,caption) values(uid,_path,_type,coalesce(_caption,'')) returning id into story_id;
 return story_id;
end $$;
revoke all on function public.entre_story_create(text,text,text) from public,anon;
grant execute on function public.entre_story_create(text,text,text) to authenticated;
create or replace function public.entre_story_delete(_id uuid)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=auth.uid(); count_deleted integer;
begin
 if uid is null then raise exception 'Faça login' using errcode='42501';end if;
 delete from public.entre_stories where id=_id and author_id=uid;
 get diagnostics count_deleted=row_count;
 return count_deleted>0;
end $$;
revoke all on function public.entre_story_delete(uuid) from public,anon;
grant execute on function public.entre_story_delete(uuid) to authenticated;
