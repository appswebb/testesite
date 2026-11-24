create or replace function public.connect_profile_read_allowed(_target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not public.entre_is_banned() and (
 _target=auth.uid() or (not public.entre_maintenance_active()
 and not exists(select 1 from public.entre_moderation m where m.user_id=_target and m.is_banned)
 and not exists(select 1 from public.entre_blocks b where (b.blocker=auth.uid() and b.blocked=_target) or (b.blocker=_target and b.blocked=auth.uid()))
 and (exists(select 1 from public.entre_pairs p where ((p.a=auth.uid() and p.b=_target) or (p.b=auth.uid() and p.a=_target)) and (p.status='connected' or (p.status='active' and p.expires_at>now()))) or exists(select 1 from public.entre_posts p where p.author_id=_target))))
$$;
revoke all on function public.connect_profile_read_allowed(uuid) from public,anon;
grant execute on function public.connect_profile_read_allowed(uuid) to authenticated;
drop policy if exists entre_profiles_post_authors on public.entre_profiles;
drop policy if exists entre_profiles_select on public.entre_profiles;
create policy entre_profiles_select on public.entre_profiles for select to authenticated using (public.connect_profile_read_allowed(id));
create index if not exists connect_asaas_recurring_charges_recurring_idx on public.connect_asaas_recurring_charges(recurring_id);
create index if not exists connect_live_applause_match_idx on public.connect_live_applause(match_id);
create index if not exists connect_live_applause_recipient_idx on public.connect_live_applause(recipient);
create index if not exists connect_live_applause_user_idx on public.connect_live_applause(user_id);
create index if not exists connect_live_matches_challenger_idx on public.connect_live_matches(challenger);
create index if not exists connect_live_settings_pinned_comment_idx on public.connect_live_settings(pinned_comment);
create index if not exists connect_live_staff_user_idx on public.connect_live_staff(user_id);
create index if not exists connect_live_stage_guests_user_idx on public.connect_live_stage_guests(user_id);
create index if not exists connect_manual_premium_audit_user_idx on public.connect_manual_premium_audit(user_id);
-- Retire the old expiration worker only if no live or unresolved charges remain.
do $$begin
 if exists(select 1 from public.connect_asaas_payments where status not in ('CONFIRMED','RECEIVED','REFUNDED','REFUND_REQUESTED','REFUND_IN_PROGRESS','PARTIALLY_REFUNDED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL','DELETED','ERROR','RECEIVED_IN_CASH')) then raise exception 'Existing provider payment requires reconciliation';end if;
 if exists(select 1 from public.connect_asaas_recurring where status in ('creating','open','active')) then raise exception 'Existing subscription requires reconciliation';end if;
 perform cron.unschedule(jobid) from cron.job where jobname='connect-asaas-expire-30minutes';
end$$;

