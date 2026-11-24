-- A user can always view and remove files within their own private folder.
-- Access to another participant's file still requires an active, unblocked pair.
drop policy if exists entre_chat_media_read on storage.objects;
create policy entre_chat_media_read on storage.objects for select to authenticated
using (
 bucket_id='entre-chat-media'
 and ((storage.foldername(name))[1]=(select auth.uid())::text
    or public.entre_chat_media_view_allowed(name))
);