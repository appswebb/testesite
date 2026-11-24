create or replace function public.connect_live_interact(_live uuid, _action text default 'read', _body text default null, _comment uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); l public.entre_lives%rowtype; result jsonb; muted boolean; v_banned boolean; staff boolean;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501'; end if;
 select * into l from public.entre_lives where id=_live and status='active' and expires_at>now();
 if not found or exists(select 1 from public.entre_moderation where user_id=l.host_id and is_banned) or exists(select 1 from public.entre_blocks where (blocker=me and blocked=l.host_id) or (blocker=l.host_id and blocked=me)) then raise exception 'Live indisponível' using errcode='42501'; end if;
 select exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and banned),exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and muted_until>now()) into v_banned,muted;
 staff:=l.host_id=me or exists(select 1 from public.connect_live_staff where live_id=_live and user_id=me);
 if v_banned then return jsonb_build_object('banned',true,'comments_enabled',false,'comments','[]'::jsonb);end if;
 if _action='comment' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text||_live::text,0));
  select * into l from public.entre_lives where id=_live and status='active' and expires_at>now() for share;
  if exists(select 1 from public.connect_live_restrictions where live_id=_live and user_id=me and (banned or muted_until>now())) then raise exception 'Você está silenciado nesta live' using errcode='42501'; end if;
  if not found or not l.comments_enabled then raise exception 'Comentários indisponíveis'; end if;
  _body:=btrim(coalesce(_body,''));
  if exists(select 1 from public.connect_live_settings cfg cross join lateral unnest(cfg.blocked_words) w(term) where cfg.live_id=_live and strpos(lower(_body),w.term)>0) then raise exception 'Comentário contém termo bloqueado';end if;
  if char_length(_body) not between 1 and 250 then raise exception 'Mensagem inválida'; end if;
  if exists(select 1 from public.connect_live_comments where live_id=_live and user_id=me and created_at>now()-interval '2 seconds') then raise exception 'Aguarde antes de comentar novamente'; end if;
  insert into public.connect_live_comments(live_id,user_id,body) values(_live,me,_body);
 elsif _action='heart' then
  insert into public.connect_live_hearts(live_id,user_id) values(_live,me)
  on conflict(live_id,user_id) do update set count=least(public.connect_live_hearts.count+1,10000),updated_at=now()
  where public.connect_live_hearts.updated_at<now()-interval '1 second';
 elsif _action='delete' then
  delete from public.connect_live_comments where id=_comment and live_id=_live and (user_id=me or staff);
 elsif _action in ('close','open') then
  if not staff then raise exception 'Sem permissão' using errcode='42501'; end if;
  update public.entre_lives set comments_enabled=(_action='open') where id=_live returning * into l;
 elsif _action <> 'read' then raise exception 'Ação inválida'; end if;
 select jsonb_build_object('comments_enabled',l.comments_enabled and not muted,'muted',muted,'can_moderate',staff,'hearts',coalesce((select sum(count) from public.connect_live_hearts where live_id=_live),0),'comments',
 coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at,c.id) from (
 select m.id,m.user_id,m.body,m.created_at,coalesce(p.display_name,'Pessoa') as name,(m.user_id=me or staff) as can_delete
 from public.connect_live_comments m left join public.entre_profiles p on p.id=m.user_id
 where m.live_id=_live and not exists(select 1 from public.connect_live_restrictions r where r.live_id=_live and r.user_id=m.user_id and (r.banned or r.muted_until>now())) and not exists(select 1 from public.entre_blocks b where (b.blocker=me and b.blocked=m.user_id) or (b.blocker=m.user_id and b.blocked=me)) and not exists(select 1 from public.entre_moderation where user_id=m.user_id and is_banned)
 order by m.created_at desc,m.id desc limit 50) c),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.connect_live_interact(uuid,text,text,uuid) from public,anon;
grant execute on function public.connect_live_interact(uuid,text,text,uuid) to authenticated;



