-- Show the entire discussion as paged items in the comment sheet, not the small feed preview.
create index if not exists entre_post_comments_post_id_desc_idx
on public.entre_post_comments (post_id,id desc);
create or replace function public.entre_post_comments_page(_post bigint,_before bigint default null)
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare uid uuid:=auth.uid();result jsonb;has_more boolean;rows_count integer;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then
  raise exception 'Faça login para ver comentários' using errcode='42501';
 end if;
 if not exists (
   select 1 from public.entre_posts p
   where p.id=_post
   and not exists (select 1 from public.entre_moderation m where m.user_id=p.author_id and m.is_banned)
   and not exists (select 1 from public.entre_blocks b where
     (b.blocker=uid and b.blocked=p.author_id) or (b.blocked=uid and b.blocker=p.author_id))
 ) then raise exception 'Publicação indisponível' using errcode='42501';end if;
 with chunk as (
   select c.id,c.body,c.created_at,c.edited_at,c.author_id,
    coalesce(pro.display_name,'Pessoa') name,
    pro.avatar_path,pro.avatar_uploaded_at,
    public.entre_premium_active(c.author_id) as premium
   from public.entre_post_comments c
   left join public.entre_profiles pro on pro.id=c.author_id
   where c.post_id=_post and (_before is null or c.id<_before)
    and not exists(select 1 from public.entre_blocks b
      where (b.blocker=uid and b.blocked=c.author_id) or (b.blocked=uid and b.blocker=c.author_id))
    and not exists(select 1 from public.entre_moderation m where m.user_id=c.author_id and m.is_banned)
   order by c.id desc limit 31
 ), sorted as (
   select chunk.*,row_number() over(order by id desc) rn from chunk
 )
 select coalesce(jsonb_agg(to_jsonb(x)-'rn' order by x.id desc)
     filter(where x.rn<=30),'[]'::jsonb),
   coalesce(bool_or(x.rn>30),false)
 into result,has_more from sorted x;
 return jsonb_build_object('items',result,'has_more',has_more);
end $$;
revoke all on function public.entre_post_comments_page(bigint,bigint) from public,anon;
grant execute on function public.entre_post_comments_page(bigint,bigint) to authenticated;
