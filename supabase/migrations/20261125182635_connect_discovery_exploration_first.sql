CREATE OR REPLACE FUNCTION public.connect_discovery_people_v2(_rotation integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();
begin
 if not public.connect_vnext_member() then raise exception 'Acesso indisponível';end if;
 return coalesce((
 with candidates as materialized (
 select p.id,p.username,p.display_name,p.age,p.avatar_path,p.avatar_uploaded_at,d.interests,d.goal,
 (select count(*)::int from unnest(d.interests) t where t=any(coalesce(me.interests,'{}'::text[]))) common,
 coalesce(pr.visible and pr.last_seen>now()-interval '5 minutes',false) online,
 coalesce(me.goal=d.goal,false) same_goal,
 coalesce(cardinality(me.interests),0) my_count,
 coalesce(pr.visible and pr.last_seen>now()-interval '24 hours',false) recently_active,
 (('x'||substr(md5(u::text||':'||p.id::text||':'||current_date::text||':'||coalesce(_rotation,0)::text),1,7))::bit(28)::int)/268435455.0 noise
 from public.connect_discovery_profiles d join public.entre_profiles p on p.id=d.user_id
 left join public.connect_discovery_profiles me on me.user_id=u
 left join public.entre_presence pr on pr.user_id=p.id
 where d.visible and p.id<>u and p.onboarding_plan_selected and public.connect_vnext_visible(p.id)
 and not exists(select 1 from public.entre_follows f where f.status='accepted' and ((f.follower=u and f.followed=p.id) or (f.followed=u and f.follower=p.id)))
 and not exists(select 1 from public.entre_pairs ep where ep.status='connected' and ((ep.a=u and ep.b=p.id) or (ep.b=u and ep.a=p.id)))
 ), scored as (
 select *, (least(common,4)*1.1 + case when same_goal then 1.0 else 0 end
 + case when online then .7 when recently_active then .3 else 0 end + noise*2.2) affinity_score,
 (case when common=0 then 2.0 else 0 end + case when online then .5 else 0 end + noise*2.5) exploration_score
 from candidates
 ), exploration as (
 select *,row_number() over(order by exploration_score desc,id) pos from scored
 order by exploration_score desc,id limit (select least(10,(count(*)+2)/3) from scored)
 ), affinity as (
 select *,row_number() over(order by affinity_score desc,id) pos from scored
 where id not in(select id from exploration) order by affinity_score desc,id limit 20
 ), mixed as (
 select id,username,display_name,age,avatar_path,avatar_uploaded_at,interests,goal,common,online,
 case when common>0 then 'shared' when same_goal then 'goal' else 'explore' end reason,
 pos*3/2 sort_order,0 lane from affinity
 union all
 select id,username,display_name,age,avatar_path,avatar_uploaded_at,interests,goal,common,online,
 'explore' reason,pos*3-1 sort_order,1 lane from exploration
 )
 select jsonb_agg(to_jsonb(mixed)-'sort_order'-'lane' order by sort_order,lane,id) from mixed
 ),'[]'::jsonb);
end $function$;
