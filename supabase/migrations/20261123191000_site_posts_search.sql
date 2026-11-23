-- Feed search respects the same exclusions as the public feed.
create or replace function public.entre_site_posts_search(_query text)
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); t text:=left(btrim(coalesce(_query,'')),60); result jsonb;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Busca indisponível' using errcode='42501';end if;
 if char_length(t)<2 then return '[]'::jsonb;end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc),'[]'::jsonb) into result
 from (select p.id,left(p.body,220) body,p.created_at,pr.display_name,pr.username
 from public.entre_posts p join public.entre_profiles pr on pr.id=p.author_id
 where (p.body ilike '%'||t||'%' or pr.display_name ilike '%'||t||'%')
 and not exists(select 1 from public.entre_moderation m where m.user_id=p.author_id and m.is_banned)
 and not exists(select 1 from public.entre_blocks b where (b.blocker=me and b.blocked=p.author_id) or (b.blocker=p.author_id and b.blocked=me))
 order by p.id desc limit 12) x;
 return result;
end $$;
revoke all on function public.entre_site_posts_search(text) from public,anon;
grant execute on function public.entre_site_posts_search(text) to authenticated;
