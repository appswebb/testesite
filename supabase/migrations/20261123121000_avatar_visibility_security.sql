-- Fix avatar access checks without granting users direct access to online-status,
-- moderation, private pairs or posts tables.
create or replace function public.entre_avatar_visible_for(_owner_text text)
returns boolean language plpgsql stable security definer set search_path to ''
as $$
declare viewer uuid:=(select auth.uid()); owner uuid;
begin
 if viewer is null or public.entre_is_banned() or public.entre_maintenance_active() then return false;end if;
 if _owner_text is null or _owner_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false;end if;
 owner:=_owner_text::uuid;
 if owner=viewer then return true;end if;
 if exists(select 1 from public.entre_moderation m where m.user_id=owner and m.is_banned) then return false;end if;
 if exists(select 1 from public.entre_blocks b
  where (b.blocker=viewer and b.blocked=owner) or (b.blocker=owner and b.blocked=viewer))
 then return false;end if;
 return
  exists(select 1 from public.entre_pairs p
   where ((p.a=viewer and p.b=owner) or (p.b=viewer and p.a=owner))
    and (p.status='connected' or (p.status='active' and p.expires_at>now())))
  or exists(select 1 from public.entre_presence p
   where p.user_id=owner and p.visible and p.last_seen>now()-interval '90 seconds')
  or exists(select 1 from public.entre_posts p where p.author_id=owner);
end;$$;
revoke all on function public.entre_avatar_visible_for(text) from public,anon;
grant execute on function public.entre_avatar_visible_for(text) to authenticated;

drop policy if exists entre_avatar_read_authorized on storage.objects;
drop policy if exists entre_avatar_post_authors on storage.objects;
drop policy if exists entre_avatar_read_scoped on storage.objects;
create policy entre_avatar_read_scoped on storage.objects
 for select to authenticated
 using (
  bucket_id='entre-avatars'
  and public.entre_avatar_visible_for((storage.foldername(name))[1])
 );
