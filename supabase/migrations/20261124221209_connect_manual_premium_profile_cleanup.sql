create function public.connect_manual_premium_profile_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.connect_manual_premium_audit where user_id=old.id;
 delete from public.connect_manual_premium where user_id=old.id;
 return old;
end $$;
revoke all on function public.connect_manual_premium_profile_cleanup() from public,anon,authenticated;
create trigger connect_manual_premium_profile_cleanup after delete on public.entre_profiles for each row execute function public.connect_manual_premium_profile_cleanup();

