create function public.connect_world_profile_setup(_profile jsonb,_country text,_scope text,_language text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 insert into public.entre_profiles(id,display_name,username,age,gender,preference,avatar_path)
 values(u,_profile->>'display_name',_profile->>'username',(_profile->>'age')::smallint,_profile->>'gender',coalesce(_profile->>'preference','any'),_profile->>'avatar_path')
 on conflict(id) do update set display_name=excluded.display_name,username=excluded.username,age=excluded.age,gender=excluded.gender,preference=excluded.preference,avatar_path=coalesce(excluded.avatar_path,public.entre_profiles.avatar_path);
 return public.connect_world_save(_country,_scope,_language);
end $$;
revoke all on function public.connect_world_profile_setup(jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.connect_world_profile_setup(jsonb,text,text,text) to authenticated;