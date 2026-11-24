-- Private, pair-scoped media for a live or mutually continued conversation.
-- Original messages and matching functions remain unchanged.
create table if not exists public.entre_pair_media(
 id uuid primary key default gen_random_uuid(),
 pair_id uuid not null references public.entre_pairs(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 media_path text not null unique,
 media_type text not null check(media_type in ('image','video','audio')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '10 days')
);
create index if not exists entre_pair_media_pair_recent on public.entre_pair_media(pair_id,created_at desc);
create index if not exists entre_pair_media_author_recent on public.entre_pair_media(sender_id,created_at desc);
alter table public.entre_pair_media enable row level security;
revoke all on public.entre_pair_media from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('entre-chat-media','entre-chat-media',false,20971520,
 array['image/webp','video/mp4','video/webm','audio/webm','audio/mp4'])
on conflict(id) do update set public=false,file_size_limit=20971520,
 allowed_mime_types=array['image/webp','video/mp4','video/webm','audio/webm','audio/mp4'];

create or replace function public.entre_chat_pair_allowed(_pair uuid)
returns boolean language sql stable security definer set search_path to ''
as $$
 select auth.uid() is not null
 and not public.entre_is_banned() and not public.entre_maintenance_active()
 and exists(select 1 from public.entre_pairs p
  where p.id=_pair and (p.a=auth.uid() or p.b=auth.uid())
   and (p.status='connected' or (p.status='active' and p.expires_at>now()))
   and not exists(select 1 from public.entre_blocks b
    where (b.blocker=p.a and b.blocked=p.b) or (b.blocker=p.b and b.blocked=p.a)))
$$;
revoke all on function public.entre_chat_pair_allowed(uuid) from public,anon;
grant execute on function public.entre_chat_pair_allowed(uuid) to authenticated;

create or replace function public.entre_chat_upload_allowed(_path text)
returns boolean language sql stable security definer set search_path to ''
as $$
 select auth.uid() is not null and
 _path ~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}/[0-9a-f-]{36}[.](webp|mp4|webm|m4a)$')
 and public.entre_chat_pair_allowed(
  case when (storage.foldername(_path))[2] ~ '^[0-9a-f-]{36}$'
    then (storage.foldername(_path))[2]::uuid else null end
 )
 and (select count(*) from storage.objects o where o.bucket_id='entre-chat-media'
  and o.name like auth.uid()::text||'/%'
  and o.created_at>now()-interval '1 day')<35
$$;
revoke all on function public.entre_chat_upload_allowed(text) from public,anon;
grant execute on function public.entre_chat_upload_allowed(text) to authenticated;

create or replace function public.entre_chat_media_view_allowed(_path text)
returns boolean language sql stable security definer set search_path to ''
as $$
 select exists(select 1 from public.entre_pair_media m
  where m.media_path=_path and m.expires_at>now()
    and public.entre_chat_pair_allowed(m.pair_id))
$$;
revoke all on function public.entre_chat_media_view_allowed(text) from public,anon;
grant execute on function public.entre_chat_media_view_allowed(text) to authenticated;

drop policy if exists entre_chat_media_upload on storage.objects;
create policy entre_chat_media_upload on storage.objects for insert to authenticated
with check(bucket_id='entre-chat-media' and public.entre_chat_upload_allowed(name));
drop policy if exists entre_chat_media_read on storage.objects;
create policy entre_chat_media_read on storage.objects for select to authenticated
using(bucket_id='entre-chat-media' and
 (public.entre_chat_upload_allowed(name) or public.entre_chat_media_view_allowed(name)));
drop policy if exists entre_chat_media_delete on storage.objects;
create policy entre_chat_media_delete on storage.objects for delete to authenticated
using(bucket_id='entre-chat-media' and
 (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.entre_chat_media_add(_pair uuid,_path text,_kind text)
returns uuid language plpgsql security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); mid uuid; mime text;
begin
 if me is null or not public.entre_chat_pair_allowed(_pair) then
  raise exception 'Você não pode enviar mídia a este encontro' using errcode='42501'; end if;
 if _kind not in ('image','video','audio') then raise exception 'Tipo de mídia inválido'; end if;
 if _path !~ ('^'||me::text||'/'||_pair::text||'/[0-9a-f-]{36}[.](webp|mp4|webm|m4a)$')
 then raise exception 'Arquivo não autorizado' using errcode='42501'; end if;
 select o.metadata->>'mimetype' into mime
 from storage.objects o where o.bucket_id='entre-chat-media' and o.name=_path;
 if mime is null or not (
  (_kind='image' and mime='image/webp')
  or (_kind='video' and mime in ('video/mp4','video/webm'))
  or (_kind='audio' and mime in ('audio/webm','audio/mp4'))
 ) then raise exception 'Formato não permitido' using errcode='42501'; end if;
 if (select count(*) from public.entre_pair_media where sender_id=me and created_at>now()-interval '1 day')>=25
 then raise exception 'Limite diário de arquivos atingido'; end if;
 if (select count(*) from public.entre_pair_media where sender_id=me and created_at>now()-interval '1 minute')>=5
 then raise exception 'Envie um arquivo por vez'; end if;
 insert into public.entre_pair_media(pair_id,sender_id,media_path,media_type)
 values(_pair,me,_path,_kind) returning id into mid;
 return mid;
end $$;
revoke all on function public.entre_chat_media_add(uuid,text,text) from public,anon;
grant execute on function public.entre_chat_media_add(uuid,text,text) to authenticated;

create or replace function public.entre_chat_media_list(_pair uuid)
returns jsonb language sql stable security definer set search_path to ''
as $$
 select case when not public.entre_chat_pair_allowed(_pair)
 then '[]'::jsonb
 else coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at asc)
   from (select id,pair_id,sender_id,media_path,media_type,created_at
    from public.entre_pair_media
    where pair_id=_pair and expires_at>now()
    order by created_at desc limit 40) m),'[]'::jsonb) end
$$;
revoke all on function public.entre_chat_media_list(uuid) from public,anon;
grant execute on function public.entre_chat_media_list(uuid) to authenticated;

create or replace function public.entre_chat_media_delete(_id uuid)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); cnt integer;
begin
 if me is null then raise exception 'Autenticação exigida' using errcode='42501'; end if;
 delete from public.entre_pair_media where id=_id and sender_id=me
   and public.entre_chat_pair_allowed(pair_id);
 get diagnostics cnt=row_count;
 return cnt>0;
end $$;
revoke all on function public.entre_chat_media_delete(uuid) from public,anon;
grant execute on function public.entre_chat_media_delete(uuid) to authenticated;