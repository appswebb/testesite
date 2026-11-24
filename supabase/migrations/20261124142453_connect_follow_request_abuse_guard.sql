begin;
CREATE OR REPLACE FUNCTION public.entre_follow_request(_target uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();current text;daily integer;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Conta indisponível';end if;
 if _target is null or _target=uid then raise exception 'Pessoa inválida';end if;
 if not exists(select 1 from public.entre_profiles ep where ep.id=_target)
 then raise exception 'Este perfil não está disponível para seguir';end if;
 if exists(select 1 from public.entre_blocks x where
 (x.blocker=uid and x.blocked=_target) or (x.blocker=_target and x.blocked=uid)) then raise exception 'Solicitação indisponível';end if;
 if exists(select 1 from public.entre_moderation x where x.user_id=_target and x.is_banned) then raise exception 'Pessoa indisponível';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text,44107));
 select status into current from public.entre_follows where follower=uid and followed=_target;
 if current='accepted' then return jsonb_build_object('status','accepted');end if;
 if current='pending' then return jsonb_build_object('status','pending');end if;
 if exists(select 1 from public.entre_follows where follower=uid and followed=_target and status='declined' and updated_at>now()-interval '10 minutes') then raise exception 'Aguarde alguns minutos antes de enviar outro pedido';end if;
 select count(*) into daily from public.entre_follows where follower=uid and updated_at>now()-interval '24 hours';
 if daily>=20 then raise exception 'Limite diário de solicitações atingido';end if;
 insert into public.entre_follows(follower,followed,status) values(uid,_target,'pending')
 on conflict(follower,followed) do update set status='pending',updated_at=now();
 insert into public.entre_notifications(user_id,actor_id,kind) values(_target,uid,'follow');
 return jsonb_build_object('status','pending');
end $function$
;
revoke all on function public.entre_follow_request(uuid) from public,anon;
grant execute on function public.entre_follow_request(uuid) to authenticated;
commit;