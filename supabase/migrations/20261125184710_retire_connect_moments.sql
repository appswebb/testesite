-- Remove only the retired short-video feature. Preserve discovery and shared media.
drop policy if exists connect_moment_upload_reserved on storage.objects;
drop policy if exists connect_moment_read_active on storage.objects;
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='connect-moments') then raise exception 'Retired bucket still contains files; remove using Storage API first';end if;
end $$;
create or replace function public.connect_admin_product_metrics()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.entre_admin_check() then raise exception 'Acesso negado'; end if;
 select jsonb_build_object(
 'profiles',(select count(*) from public.entre_profiles),
 'profiles_7d',(select count(*) from public.entre_profiles where created_at>now()-interval '7 days'),
 'active_presence_24h',(select count(*) from public.entre_presence where last_seen>now()-interval '24 hours'),
 'encounters_7d',(select count(*) from public.entre_pairs where origin='live' and created_at>now()-interval '7 days'),
 'matches_7d',(select count(*) from public.entre_pairs where origin='live' and created_at>now()-interval '7 days' and status='connected'),
 'discovery_opt_in',(select count(*) from public.connect_discovery_profiles where visible)
 ) into result;return result;
end $$;
drop function if exists public.connect_admin_moment_review(bigint,text);
drop function if exists public.connect_admin_moments();
drop function if exists public.connect_moment_comment(uuid,text);
drop function if exists public.connect_moment_comment_remove(bigint);
drop function if exists public.connect_moment_comments_list(uuid);
drop function if exists public.connect_moment_like(uuid,boolean);
drop function if exists public.connect_moment_report(uuid,text);
drop function if exists public.connect_moments_feed();
drop function if exists public.connect_moment_publish(uuid,text);
drop function if exists public.connect_moment_reserve(text);
drop function if exists public.connect_moment_remove(uuid);
drop function if exists public.connect_moment_cleanup_rows();
drop function if exists public.connect_moment_cleanup_candidates();
drop function if exists public.connect_moment_read(text);
drop function if exists public.connect_moment_upload(text);
drop table if exists public.connect_moment_reports;
drop table if exists public.connect_moment_comments;
drop table if exists public.connect_moment_likes;
drop table if exists public.connect_moments;
