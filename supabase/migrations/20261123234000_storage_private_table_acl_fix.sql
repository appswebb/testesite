-- Storage policy hardening: prevent private-table ACL failures from breaking
-- signed avatar, feed-media and story URLs for every authenticated user.
create or replace function public.entre_post_media_allowed(_path text)
returns boolean language sql stable security definer set search_path to ''
as $$
 select auth.uid() is not null
   and not public.entre_is_banned()
   and not public.entre_maintenance_active()
   and exists (
     select 1 from public.entre_posts p where p.media_path=_path
       and not exists(select 1 from public.entre_moderation m where m.user_id=p.author_id and m.is_banned)
       and not exists(select 1 from public.entre_blocks b
         where (b.blocker=auth.uid() and b.blocked=p.author_id)
            or (b.blocker=p.author_id and b.blocked=auth.uid()))
   )
$$;
revoke all on function public.entre_post_media_allowed(text) from public,anon;
grant execute on function public.entre_post_media_allowed(text) to authenticated;

drop policy if exists entre_post_media_read_visible on storage.objects;
create policy entre_post_media_read_visible on storage.objects
for select to authenticated
using (
 bucket_id='entre-post-media'
 and not public.entre_is_banned() and not public.entre_maintenance_active()
 and (
   (storage.foldername(name))[1]=(select auth.uid())::text
   or public.entre_post_media_allowed(name)
 )
);

-- Support evidence belongs only to its ticket author while the ticket is a
-- recent draft. An authenticated Storage policy cannot query the private
-- support table directly without a definer check.
create or replace function public.entre_support_draft_upload_allowed(_path text)
returns boolean language sql stable security definer set search_path to ''
as $$
 select auth.uid() is not null
   and exists(
     select 1 from public.entre_support_tickets t
     where t.owner_id=auth.uid()
       and t.id::text=(storage.foldername(_path))[2]
       and t.status='draft'
       and t.created_at>now()-interval '30 minutes'
   )
$$;
revoke all on function public.entre_support_draft_upload_allowed(text) from public,anon;
grant execute on function public.entre_support_draft_upload_allowed(text) to authenticated;

drop policy if exists entre_support_evidence_upload on storage.objects;
create policy entre_support_evidence_upload on storage.objects
for insert to authenticated
with check (
 bucket_id='entre-support-evidence'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and public.entre_support_draft_upload_allowed(name)
);