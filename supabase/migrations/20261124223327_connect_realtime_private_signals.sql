create table public.connect_account_signal (
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('pair','premium')),
 revision bigint not null default 1,
 primary key(user_id,kind)
);
alter table public.connect_account_signal enable row level security;
revoke all on public.connect_account_signal from public,anon,authenticated;
grant select on public.connect_account_signal to authenticated;
create policy connect_account_signal_own on public.connect_account_signal for select to authenticated using(user_id=(select auth.uid()));
alter publication supabase_realtime add table public.connect_account_signal;
create function public.connect_emit_account_signal(_uid uuid,_kind text) returns void language sql security definer set search_path='' as $$
 insert into public.connect_account_signal(user_id,kind) select _uid,_kind where exists(select 1 from auth.users where id=_uid)
 on conflict(user_id,kind) do update set revision=public.connect_account_signal.revision+1
$$;
revoke all on function public.connect_emit_account_signal(uuid,text) from public,anon,authenticated;
create function public.connect_pair_signal() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.status is not distinct from old.status and new.a_wants is not distinct from old.a_wants and new.b_wants is not distinct from old.b_wants then return null;end if;
 if tg_op='DELETE' then
  perform public.connect_emit_account_signal(least(old.a,old.b),'pair');
  perform public.connect_emit_account_signal(greatest(old.a,old.b),'pair');
 else
  perform public.connect_emit_account_signal(least(new.a,new.b),'pair');
  perform public.connect_emit_account_signal(greatest(new.a,new.b),'pair');
 end if;return null;
end $$;
revoke all on function public.connect_pair_signal() from public,anon,authenticated;
create trigger connect_pair_signal after insert or delete or update of status,a_wants,b_wants on public.entre_pairs for each row execute function public.connect_pair_signal();
create function public.connect_premium_signal() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then perform public.connect_emit_account_signal(old.user_id,'premium');
 else perform public.connect_emit_account_signal(new.user_id,'premium');end if;
 return null;
end $$;
revoke all on function public.connect_premium_signal() from public,anon,authenticated;
create trigger connect_premium_signal after insert or update or delete on public.connect_manual_premium for each row execute function public.connect_premium_signal();
create table public.connect_admin_signal(kind text primary key,revision bigint not null default 0);
alter table public.connect_admin_signal enable row level security;
revoke all on public.connect_admin_signal from public,anon,authenticated;
grant select on public.connect_admin_signal to authenticated;
create policy connect_admin_signal_only on public.connect_admin_signal for select to authenticated using ((select public.entre_admin_check()));
alter publication supabase_realtime add table public.connect_admin_signal;
insert into public.connect_admin_signal(kind) values ('users'),('pairs'),('bulletins'),('support'),('reports'),('appeals'),('security'),('premium'),('settings');
create function public.connect_emit_admin_signal() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.connect_admin_signal set revision=revision+1 where kind=tg_argv[0];return null;
end $$;
revoke all on function public.connect_emit_admin_signal() from public,anon,authenticated;
create trigger connect_admin_profiles_signal after insert or delete or update of display_name,username,age,gender on public.entre_profiles for each statement execute function public.connect_emit_admin_signal('users');
create trigger connect_admin_moderation_signal after insert or update or delete on public.entre_moderation for each statement execute function public.connect_emit_admin_signal('users');
create trigger connect_admin_pairs_signal after insert or delete or update of status on public.entre_pairs for each statement execute function public.connect_emit_admin_signal('pairs');
create trigger connect_admin_bulletins_signal after insert or delete on public.entre_bulletins for each statement execute function public.connect_emit_admin_signal('bulletins');
create trigger connect_admin_votes_signal after insert or delete on public.entre_bulletin_votes for each statement execute function public.connect_emit_admin_signal('bulletins');
create trigger connect_admin_replies_signal after insert or update or delete on public.entre_bulletin_replies for each statement execute function public.connect_emit_admin_signal('bulletins');
create trigger connect_admin_support_signal after insert or update or delete on public.entre_support_tickets for each statement execute function public.connect_emit_admin_signal('support');
create trigger connect_admin_support_replies_signal after insert or delete on public.entre_support_replies for each statement execute function public.connect_emit_admin_signal('support');
create trigger connect_admin_reports_signal after insert or update or delete on public.entre_reports for each statement execute function public.connect_emit_admin_signal('reports');
create trigger connect_admin_comment_reports_signal after insert or update or delete on public.entre_comment_reports for each statement execute function public.connect_emit_admin_signal('reports');
create trigger connect_admin_appeals_signal after insert or update or delete on public.entre_suspension_appeals for each statement execute function public.connect_emit_admin_signal('appeals');
create trigger connect_admin_privacy_signal after insert or update or delete on public.entre_privacy_requests for each statement execute function public.connect_emit_admin_signal('security');
create trigger connect_admin_manual_signal after insert or update or delete on public.connect_manual_premium for each statement execute function public.connect_emit_admin_signal('premium');
create trigger connect_admin_price_signal after update on public.entre_premium_settings for each statement execute function public.connect_emit_admin_signal('premium');
create trigger connect_admin_settings_signal after update on public.entre_site_settings for each statement execute function public.connect_emit_admin_signal('settings');
create table public.connect_public_signal(id integer primary key check(id=1),revision bigint not null default 0);
insert into public.connect_public_signal(id) values(1);
alter table public.connect_public_signal enable row level security;
revoke all on public.connect_public_signal from public,anon,authenticated;
grant select on public.connect_public_signal to anon,authenticated;
create policy connect_public_signal_read on public.connect_public_signal for select to anon,authenticated using(id=1);
alter publication supabase_realtime add table public.connect_public_signal;
create function public.connect_emit_public_signal() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.connect_public_signal set revision=revision+1 where id=1;return null;end $$;
revoke all on function public.connect_emit_public_signal() from public,anon,authenticated;
create trigger connect_site_settings_signal after update on public.entre_site_settings for each statement execute function public.connect_emit_public_signal();

