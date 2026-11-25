CREATE FUNCTION public.connect_feed_v2(_before bigint DEFAULT NULL::bigint, _mode text DEFAULT 'recent')
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();items jsonb;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 if _mode not in ('recent','following','recommended','trending','region') or _mode is null then raise exception 'Filtro inválido'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',p.id,'body',p.body,'media_path',p.media_path,'media_type',p.media_type,'created_at',p.created_at,'edited_at',p.edited_at,
  'author_id',p.author_id,'author_name',a.display_name,'author_avatar',a.avatar_path,'author_avatar_uploaded_at',a.avatar_uploaded_at,
  'premium',public.entre_premium_active(p.author_id),
  'likes',(select count(*) from public.entre_post_likes l where l.post_id=p.id),
  'liked',(select exists(select 1 from public.entre_post_likes l where l.post_id=p.id and l.user_id=uid)),
  'comments',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'author_id',c.author_id,'name',coalesce(cp.display_name,'Pessoa'),'premium',public.entre_premium_active(c.author_id),'created_at',c.created_at) order by c.created_at),'[]'::jsonb)
    from (select pc.* from public.entre_post_comments pc where pc.post_id=p.id and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=pc.author_id) or (b.blocker=pc.author_id and b.blocked=uid)) and not exists(select 1 from public.entre_moderation m where m.user_id=pc.author_id and m.is_banned) order by pc.created_at desc limit 10) c
    left join public.entre_profiles cp on cp.id=c.author_id)
 ) order by case when _mode='trending' then (select count(*) from public.entre_post_likes l where l.post_id=p.id) else 0 end desc, p.id desc),'[]'::jsonb) into items
 from (select pp.* from public.entre_posts pp join public.entre_profiles pr on pr.id=pp.author_id where (_before is null or pp.id<_before) and (
 _mode='recent' or (_mode='following' and (pp.author_id=uid or exists(select 1 from public.entre_follows f where f.follower=uid and f.followed=pp.author_id and f.status='accepted')))
 or (_mode='region' and exists(select 1 from public.entre_member_locations a join public.entre_member_locations b on a.state_code=b.state_code where a.user_id=uid and b.user_id=pp.author_id and a.state_code is not null))
 or (_mode='recommended' and (pp.author_id=uid or exists(select 1 from public.connect_discovery_profiles a join public.connect_discovery_profiles b on a.interests && b.interests where a.user_id=uid and b.user_id=pp.author_id and b.visible)))
 or (_mode='trending' and pp.created_at>now()-interval '72 hours')) and not exists(select 1 from public.entre_moderation m where m.user_id=pp.author_id and m.is_banned) and not exists(select 1 from public.entre_blocks b where (b.blocker=uid and b.blocked=pp.author_id) or (b.blocker=pp.author_id and b.blocked=uid)) order by case when _mode='trending' then (select count(*) from public.entre_post_likes l where l.post_id=pp.id) else 0 end desc,pp.id desc limit 15) p join public.entre_profiles a on a.id=p.author_id;
 return items;
end $function$;

revoke all on function public.connect_feed_v2(bigint,text) from public,anon;
grant execute on function public.connect_feed_v2(bigint,text) to authenticated;
create function public.connect_admin_product_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.entre_admin_check() then raise exception 'Acesso negado'; end if;
 select jsonb_build_object(
 'profiles',(select count(*) from public.entre_profiles),
 'profiles_7d',(select count(*) from public.entre_profiles where created_at>now()-interval '7 days'),
 'active_presence_24h',(select count(*) from public.entre_presence where last_seen>now()-interval '24 hours'),
 'encounters_7d',(select count(*) from public.entre_pairs where origin='live' and created_at>now()-interval '7 days'),
 'matches_7d',(select count(*) from public.entre_pairs where origin='live' and created_at>now()-interval '7 days' and status='connected'),
 'moments_active',(select count(*) from public.connect_moments where status='published' and expires_at>now()),
 'moments_bytes',(select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects where bucket_id='connect-moments'),
 'moments_reports',(select count(*) from public.connect_moment_reports where status='open'),
 'discovery_opt_in',(select count(*) from public.connect_discovery_profiles where visible)
 ) into result;return result;
end $$;
revoke all on function public.connect_admin_product_metrics() from public,anon;
grant execute on function public.connect_admin_product_metrics() to authenticated;
