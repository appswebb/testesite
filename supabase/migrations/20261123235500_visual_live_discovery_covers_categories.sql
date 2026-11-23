-- Visual directory for real lives. No fake viewer counts or recorded video previews.
alter table public.entre_lives
  add column if not exists category text not null default 'conversa',
  add column if not exists cover_path text;
alter table public.entre_lives
  drop constraint if exists entre_lives_category_check;
alter table public.entre_lives
  add constraint entre_lives_category_check
  check (category in ('conversa','musica','games','criatividade','outros'));
create index if not exists entre_lives_active_discovery
  on public.entre_lives (started_at desc) where status = 'active';

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('entre-live-covers','entre-live-covers',false,3145728,array['image/webp'])
on conflict (id) do update set
 public=false,file_size_limit=3145728,allowed_mime_types=array['image/webp'];

drop policy if exists entre_live_cover_upload on storage.objects;
create policy entre_live_cover_upload on storage.objects for insert to authenticated
with check (
 bucket_id='entre-live-covers'
 and (storage.foldername(name))[1] = (select auth.uid())::text
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.]webp$'
 and not public.entre_is_banned()
 and not public.entre_maintenance_active()
);
drop policy if exists entre_live_cover_delete on storage.objects;
create policy entre_live_cover_delete on storage.objects for delete to authenticated
using (bucket_id='entre-live-covers' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Cover can be signed by its owner or by an authenticated user permitted
-- to discover the corresponding currently active live. Never reveal blocked hosts.
create or replace function public.entre_live_cover_allowed(_path text)
returns boolean language sql stable security definer set search_path to ''
as $$
 select auth.uid() is not null
 and not public.entre_is_banned()
 and not public.entre_maintenance_active()
 and exists (
   select 1 from public.entre_lives l
   where l.cover_path=_path and l.status='active' and l.expires_at>now()
   and not exists(select 1 from public.entre_moderation m where m.user_id=l.host_id and m.is_banned)
   and not exists(select 1 from public.entre_blocks b
     where (b.blocker=auth.uid() and b.blocked=l.host_id)
        or (b.blocker=l.host_id and b.blocked=auth.uid()))
 )
$$;
revoke all on function public.entre_live_cover_allowed(text) from public, anon;
grant execute on function public.entre_live_cover_allowed(text) to authenticated;

drop policy if exists entre_live_cover_read on storage.objects;
create policy entre_live_cover_read on storage.objects for select to authenticated
using (
 bucket_id='entre-live-covers' and not public.entre_is_banned()
 and (
   (storage.foldername(name))[1] = (select auth.uid())::text
   or public.entre_live_cover_allowed(name)
 )
);

create or replace function public.entre_live_start_visual(
 _title text, _category text, _cover_path text
) returns uuid
language plpgsql security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); new_id uuid;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active()
 then raise exception 'Live indisponível' using errcode='42501'; end if;
 _title:=btrim(coalesce(_title,''));
 if length(_title)<3 or length(_title)>90 then
  raise exception 'Título entre 3 e 90 caracteres'; end if;
 if _category not in ('conversa','musica','games','criatividade','outros') then
  raise exception 'Categoria inválida'; end if;
 if _cover_path is not null then
  if _cover_path !~ ('^'||me::text||'/[0-9a-f-]{36}[.]webp$')
    or not exists(select 1 from storage.objects o
      where o.bucket_id='entre-live-covers' and o.name=_cover_path
        and o.metadata->>'mimetype'='image/webp') then
   raise exception 'Capa inválida ou não autorizada' using errcode='42501';
  end if;
 end if;
 if exists(select 1 from public.entre_lives where host_id=me and status='active' and expires_at>now())
 then raise exception 'Encerre sua live atual antes de começar outra'; end if;
 if (select count(*) from public.entre_lives where host_id=me and started_at>now()-interval '1 day') >= 10
 then raise exception 'Limite de 10 lives por dia'; end if;
 update public.entre_lives set status='ended',ended_at=now()
 where host_id=me and status='active' and expires_at<=now();
 insert into public.entre_lives(host_id,title,category,cover_path)
 values(me,_title,_category,_cover_path) returning id into new_id;
 return new_id;
end $$;
revoke all on function public.entre_live_start_visual(text,text,text) from public,anon;
grant execute on function public.entre_live_start_visual(text,text,text) to authenticated;

-- Preserve the cohost privacy restrictions already present in the list.
create or replace function public.entre_lives_list()
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); response jsonb;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active()
 then raise exception 'Faça login para acessar lives' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.started_at desc),'[]'::jsonb)
 into response from (
  select l.id,l.title,l.host_id,l.guest_id,
   case when l.host_id=me or l.guest_requested_by=me then l.guest_requested_by else null end as guest_requested_by,
   l.started_at,l.category,l.cover_path,
   coalesce(h.display_name,'Pessoa') host_name,h.username host_username,h.avatar_path host_avatar_path,
   coalesce(g.display_name,'') guest_name,loc.state_code,loc.city_name,
   l.host_id=me as is_host,l.guest_id=me as is_guest,l.guest_requested_by=me as requested
  from public.entre_lives l
  join public.entre_profiles h on h.id=l.host_id
  left join public.entre_profiles g on g.id=l.guest_id
  left join public.entre_member_locations loc on loc.user_id=l.host_id
  where l.status='active' and l.expires_at>now()
    and not exists(select 1 from public.entre_moderation m where m.user_id=l.host_id and m.is_banned)
    and not exists(select 1 from public.entre_blocks b where
     (b.blocker=me and b.blocked=l.host_id)
      or (b.blocker=l.host_id and b.blocked=me))
  order by l.started_at desc limit 100
 ) x;
 return response;
end $$;
revoke all on function public.entre_lives_list() from public,anon;
grant execute on function public.entre_lives_list() to authenticated;