begin;
create or replace function public.connect_support_delete(_ticket bigint) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Acesso negado' using errcode='42501';end if;
 delete from public.entre_support_tickets where id=_ticket and owner_id=auth.uid();
 if not found then raise exception 'Protocolo indisponível' using errcode='42501';end if;
 return true;
end $$;
revoke all on function public.connect_support_delete(bigint) from public,anon,authenticated;
grant execute on function public.connect_support_delete(bigint) to authenticated;
create index if not exists connect_support_expiration_idx on public.entre_support_tickets(created_at);
create or replace function public.entre_my_support_tickets() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb)
 from (select id,category,subject,status,email_status,created_at from public.entre_support_tickets where owner_id=auth.uid() and status<>'draft' and created_at>now()-interval '10 days' order by created_at desc) t
 where auth.uid() is not null;
$$;
select cron.schedule('connect-support-expire-10days','* * * * *',$job$delete from public.entre_support_tickets where created_at<=now()-interval '10 days'$job$);
create or replace function public.connect_support_cleanup_candidates() returns jsonb language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(s.name),'[]'::jsonb) from (
 select o.name from storage.objects o where o.bucket_id='entre-support-evidence' and o.created_at<now()-interval '30 minutes'
 and not exists(select 1 from public.entre_support_tickets t where t.owner_id::text=split_part(o.name,'/',1) and t.id::text=split_part(o.name,'/',2) and t.created_at>now()-interval '10 days')
 order by o.created_at limit 100
 ) s;
$$;
revoke all on function public.connect_support_cleanup_candidates() from public,anon,authenticated;
grant execute on function public.connect_support_cleanup_candidates() to service_role;
drop policy entre_support_evidence_read on storage.objects;
create policy entre_support_evidence_read on storage.objects for select to authenticated using(bucket_id='entre-support-evidence' and exists(select 1 from public.entre_support_tickets t where t.owner_id::text=(storage.foldername(name))[1] and t.id::text=(storage.foldername(name))[2] and t.created_at>now()-interval '10 days' and (t.owner_id=auth.uid() or public.entre_admin_check())));
create policy connect_support_draft_remove on storage.objects for delete to authenticated using(bucket_id='entre-support-evidence' and (storage.foldername(name))[1]=auth.uid()::text and public.entre_support_draft_upload_allowed(name));
create or replace function public.connect_profile_preference_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.preference is distinct from 'any' and not public.entre_premium_active(new.id) then new.preference:='any';end if;
 return new;
end $$;
create trigger connect_profile_preference_guard before insert or update on public.entre_profiles for each row execute function public.connect_profile_preference_guard();
update public.entre_profiles set preference='any' where preference<>'any' and not public.entre_premium_active(id);
commit;