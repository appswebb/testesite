begin;
create table public.entre_community_signal(kind text primary key check(kind in ('rooms','feed')),revision bigint not null default 0);
insert into public.entre_community_signal(kind) values('rooms'),('feed');
alter table public.entre_community_signal enable row level security;
revoke all on public.entre_community_signal from public,anon,authenticated;
grant select on public.entre_community_signal to authenticated;
create policy entre_community_signal_members on public.entre_community_signal for select to authenticated using ((select auth.uid()) is not null and not (select public.entre_is_banned()) and not (select public.entre_maintenance_active()));
create function public.entre_signal_community_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
update public.entre_community_signal set revision=revision+1 where kind=TG_ARGV[0];return null;
end $$;
revoke all on function public.entre_signal_community_change() from public,anon,authenticated;
create trigger entre_realtime_room_message after insert or delete on public.entre_room_messages for each statement execute function public.entre_signal_community_change('rooms');
create trigger entre_realtime_posts after insert or update or delete on public.entre_posts for each statement execute function public.entre_signal_community_change('feed');
create trigger entre_realtime_comments after insert or update or delete on public.entre_post_comments for each statement execute function public.entre_signal_community_change('feed');
create trigger entre_realtime_likes after insert or delete on public.entre_post_likes for each statement execute function public.entre_signal_community_change('feed');
alter publication supabase_realtime add table public.entre_community_signal;
commit;