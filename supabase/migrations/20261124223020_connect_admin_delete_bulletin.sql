alter table public.entre_community_signal drop constraint entre_community_signal_kind_check;
alter table public.entre_community_signal add constraint entre_community_signal_kind_check check(kind in ('rooms','feed','bulletins'));
insert into public.entre_community_signal(kind,revision) values('bulletins',0) on conflict do nothing;
create function public.connect_bulletin_signal() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.entre_community_signal set revision=revision+1 where kind='bulletins';
 return null;
end $$;
revoke all on function public.connect_bulletin_signal() from public,anon,authenticated;
create trigger connect_bulletin_signal after insert or delete on public.entre_bulletins for each row execute function public.connect_bulletin_signal();
create function public.entre_admin_delete_bulletin(_id bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare removed bigint; notifications integer;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 if _id is null or _id<=0 then raise exception 'Publicação inválida';end if;
 perform 1 from public.entre_bulletins where id=_id for update;
 if not found then return jsonb_build_object('deleted',false,'status','not_found');end if;
 delete from public.entre_notifications where bulletin_id=_id;
 get diagnostics notifications=row_count;
 delete from public.entre_bulletins where id=_id returning id into removed;
 return jsonb_build_object('deleted',true,'id',removed,'notifications_removed',notifications);
end $$;
revoke all on function public.entre_admin_delete_bulletin(bigint) from public,anon;
grant execute on function public.entre_admin_delete_bulletin(bigint) to authenticated;

