create table if not exists public.entre_profile_banners (
 user_id uuid primary key references public.entre_profiles(id) on delete cascade,
 mime text not null check(mime in ('image/jpeg','image/gif')),
 image_base64 text not null check(length(image_base64) between 16 and 2796204),
 zoom numeric(5,3) not null default 1 check(zoom between 1 and 3),
 pos_x numeric(5,4) not null default .5 check(pos_x between 0 and 1),
 pos_y numeric(5,4) not null default .5 check(pos_y between 0 and 1),
 updated_at timestamptz not null default now()
);
alter table public.entre_profile_banners enable row level security;
revoke all on public.entre_profile_banners from anon, authenticated;
grant select,insert,update,delete on public.entre_profile_banners to authenticated;
grant select,insert,update,delete on public.entre_profile_banners to service_role;
create policy banner_owner_select on public.entre_profile_banners for select to authenticated using ((select auth.uid())=user_id and not (select public.entre_is_banned()));
create policy banner_owner_insert on public.entre_profile_banners for insert to authenticated with check ((select auth.uid())=user_id and not (select public.entre_is_banned()) and not (select public.entre_maintenance_active()) and (mime='image/jpeg' or public.entre_premium_active(user_id)));
create policy banner_owner_update on public.entre_profile_banners for update to authenticated using ((select auth.uid())=user_id and not (select public.entre_is_banned()) and not (select public.entre_maintenance_active())) with check ((select auth.uid())=user_id and not (select public.entre_is_banned()) and not (select public.entre_maintenance_active()) and (mime='image/jpeg' or public.entre_premium_active(user_id)));
create policy banner_owner_delete on public.entre_profile_banners for delete to authenticated using ((select auth.uid())=user_id and not (select public.entre_is_banned()) and not (select public.entre_maintenance_active()));
create or replace function public.entre_validate_profile_banner() returns trigger language plpgsql security invoker set search_path='' as $$
declare raw bytea; w int; h int;
begin
 if new.image_base64 !~ '^[A-Za-z0-9+/]+={0,2}$' then raise exception 'Imagem inválida'; end if;
 raw:=decode(new.image_base64,'base64');
 if new.mime='image/gif' then
  if octet_length(raw)<14 or octet_length(raw)>2097152 or substring(raw from 1 for 6) not in (convert_to('GIF87a','UTF8'),convert_to('GIF89a','UTF8')) or get_byte(raw,octet_length(raw)-1)<>59 then raise exception 'GIF inválido ou maior que 2 MB'; end if;
  w:=get_byte(raw,6)+256*get_byte(raw,7); h:=get_byte(raw,8)+256*get_byte(raw,9);
  if w<1 or h<1 or w>2048 or h>2048 or w*h>2500000 then raise exception 'Dimensões de GIF não suportadas'; end if;
 else
  if octet_length(raw)<12 or octet_length(raw)>358400 or substring(raw from 1 for 3)<>decode('ffd8ff','hex') or substring(raw from octet_length(raw)-1 for 2)<>decode('ffd9','hex') then raise exception 'Foto JPEG inválida ou maior que 350 KB'; end if;
  new.zoom:=1;new.pos_x:=.5;new.pos_y:=.5;
 end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function public.entre_validate_profile_banner() from public,anon,authenticated;
create trigger entre_profile_banner_validate before insert or update on public.entre_profile_banners for each row execute function public.entre_validate_profile_banner();