begin;
create or replace function public.entre_profile_for_member(_target uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid(); result jsonb;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso negado' using errcode='42501'; end if;
 select jsonb_build_object('id',p.id,'username',p.username,'display_name',p.display_name,'age',p.age,'gender',p.gender,'bio',left(p.bio,250),'avatar_path',p.avatar_path,'avatar_uploaded_at',p.avatar_uploaded_at,'follow_status',(select f.status from public.entre_follows f where f.follower=me and f.followed=p.id)) into result
 from public.entre_profiles p where p.id=_target
 and not exists(select 1 from public.entre_blocks b where (b.blocker=me and b.blocked=p.id) or (b.blocker=p.id and b.blocked=me))
 and not exists(select 1 from public.entre_moderation m where m.user_id=p.id and m.is_banned);
 return result;
end $$;
revoke all on function public.entre_profile_for_member(uuid) from public,anon;
grant execute on function public.entre_profile_for_member(uuid) to authenticated;
commit;