begin;
create index if not exists entre_chat_read_cursor_pair_idx on public.entre_chat_read_cursor(pair_id);
create index if not exists entre_support_replies_author_idx on public.entre_support_replies(author_id);
create index if not exists entre_support_replies_ticket_idx on public.entre_support_replies(ticket_id,id);
create index if not exists entre_voice_activity_user_idx on public.entre_voice_activity(user_id);
revoke insert on public.entre_messages from authenticated,anon,public;
grant insert(pair_id,sender_id,body) on public.entre_messages to authenticated;
alter policy entre_messages_write on public.entre_messages with check (sender_id=(select auth.uid()) and public.entre_chat_pair_allowed(pair_id));
alter policy entre_messages_read on public.entre_messages using (public.entre_chat_pair_allowed(pair_id) and public.entre_message_visible_for_member(pair_id,id));
drop policy entre_support_tickets_admin_submitted on public.entre_support_tickets;
alter policy entre_support_tickets_read_own on public.entre_support_tickets using (owner_id=(select auth.uid()) or (status<>'draft' and (select public.entre_admin_check())));
create function public.connect_reserve_web_payment(_user uuid,_request uuid,_cents integer,_method text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if _user is null or _request is null or _cents is null or _cents<100 or _method not in ('pix','card') then return false;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_user::text,913821));
 if not exists(select 1 from public.entre_premium_settings where id=1 and enabled and monthly_price_cents=_cents) then return false;end if;
 if exists(select 1 from public.entre_premium_subscriptions where user_id=_user and status='authorized' and paid_until>now()) then return false;end if;
 if exists(select 1 from public.entre_premium_web_payments where user_id=_user and status in ('creating','pending','in_process') and created_at>now()-interval '30 minutes') then return false;end if;
 insert into public.entre_premium_web_payments(id,user_id,amount_cents,method,status) values(_request,_user,_cents,_method,'creating') on conflict(id) do nothing;
 return found;
end $$;
revoke all on function public.connect_reserve_web_payment(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.connect_reserve_web_payment(uuid,uuid,integer,text) to service_role;
commit;