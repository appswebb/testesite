-- Fix: Storage policies must not directly read a private RLS table with no SELECT grant.
-- The helper checks visibility with the caller's auth.uid() under a controlled definer.
create or replace function public.entre_story_media_allowed(_path text)
returns boolean language sql stable security definer set search_path to ''
as $$
 select auth.uid() is not null
   and not public.entre_is_banned()
   and not public.entre_maintenance_active()
   and exists (
     select 1 from public.entre_stories s
     where s.media_path = _path and s.expires_at > now()
       and not exists (select 1 from public.entre_moderation m
                       where m.user_id = s.author_id and m.is_banned)
       and not exists (select 1 from public.entre_blocks b
                       where (b.blocker=auth.uid() and b.blocked=s.author_id)
                          or (b.blocker=s.author_id and b.blocked=auth.uid()))
   )
$$;
revoke all on function public.entre_story_media_allowed(text) from public,anon;
grant execute on function public.entre_story_media_allowed(text) to authenticated;
drop policy if exists entre_story_media_view on storage.objects;
create policy entre_story_media_view on storage.objects
for select to authenticated
using (
 bucket_id='entre-story-media' and not public.entre_is_banned()
 and (
   (storage.foldername(name))[1]=(select auth.uid())::text
   or public.entre_story_media_allowed(name)
 )
);
create index if not exists entre_stories_author_recent on public.entre_stories(author_id,created_at desc);

-- Coarse region is visible in live listings, but applicants are visible only to
-- the host and to themselves. Undo the earlier accidental disclosure.
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
   l.started_at,coalesce(h.display_name,'Pessoa') host_name,h.username host_username,
   coalesce(g.display_name,'') guest_name,
   loc.state_code,loc.city_name,
   l.host_id=me as is_host,l.guest_id=me as is_guest,l.guest_requested_by=me as requested
  from public.entre_lives l
  join public.entre_profiles h on h.id=l.host_id
  left join public.entre_profiles g on g.id=l.guest_id
  left join public.entre_member_locations loc on loc.user_id=l.host_id
  where l.status='active' and l.expires_at>now()
    and not exists(select 1 from public.entre_moderation m where m.user_id=l.host_id and m.is_banned)
    and not exists(select 1 from public.entre_blocks b where
      (b.blocker=me and b.blocked=l.host_id) or (b.blocker=l.host_id and b.blocked=me))
  order by l.started_at desc limit 100
 ) x;
 return response;
end $$;
revoke all on function public.entre_lives_list() from public,anon;
grant execute on function public.entre_lives_list() to authenticated;