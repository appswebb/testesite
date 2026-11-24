drop trigger connect_admin_pairs_signal on public.entre_pairs;
create trigger connect_admin_pairs_insert_delete_signal after insert or delete on public.entre_pairs for each row execute function public.connect_emit_admin_signal('pairs');
create trigger connect_admin_pairs_status_signal after update of status on public.entre_pairs for each row when(old.status is distinct from new.status) execute function public.connect_emit_admin_signal('pairs');

