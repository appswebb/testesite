CREATE OR REPLACE FUNCTION public.entre_bulletins_feed()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();items jsonb;pending jsonb;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',b.id,'kind',b.kind,'title',b.title,'body',b.body,'options',b.options,
  'created_at',b.created_at,'expires_at',b.expires_at,
  'my_vote',(select v.option_index from public.entre_bulletin_votes v where v.bulletin_id=b.id and v.user_id=uid),
  'my_reply',(select r.body from public.entre_bulletin_replies r where r.bulletin_id=b.id and r.user_id=uid),
  'votes_total',(select count(*) from public.entre_bulletin_votes v where v.bulletin_id=b.id),
  'votes_by_option',(select coalesce(jsonb_agg(counts.total order by ord.idx),'[]'::jsonb)
    from jsonb_array_elements(b.options) with ordinality ord(value,idx)
    cross join lateral (select count(*) as total from public.entre_bulletin_votes v where v.bulletin_id=b.id and v.option_index=ord.idx-1) counts)
 ) order by b.created_at desc,b.id desc),'[]'::jsonb)
 into items from (select * from public.entre_bulletins where expires_at>now() and created_at<=now() order by created_at desc,id desc limit 40) b;
 return jsonb_build_object('items',items,'required_poll',null,'checked_at',now());
end
$function$
;

