begin;
create policy entre_support_tickets_admin_submitted on public.entre_support_tickets for select to authenticated using (status<>'draft' and (select public.entre_admin_check()));
alter publication supabase_realtime add table public.entre_support_tickets;
commit;