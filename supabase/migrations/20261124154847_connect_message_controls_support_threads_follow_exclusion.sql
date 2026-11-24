begin;
alter table public.entre_messages add column edited_at timestamptz,add column deleted_at timestamptz;
create function public.entre_message_mutate(_pair uuid,_id bigint,_body text,_delete boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); msg public.entre_messages%rowtype;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() or not exists(select 1 from public.entre_pairs p where p.id=_pair and (p.a=me or p.b=me) and (p.status='connected' or (p.status='active' and p.expires_at>now())) and not exists(select 1 from public.entre_blocks b where (b.blocker=p.a and b.blocked=p.b) or (b.blocker=p.b and b.blocked=p.a))) then raise exception 'Acesso negado' using errcode='42501';end if;
 if not coalesce(_delete,false) and length(trim(coalesce(_body,''))) not between 1 and 1500 then raise exception 'Mensagem inválida';end if;
 update public.entre_messages set body=case when _delete then 'Mensagem apagada' else trim(_body) end,edited_at=case when _delete then edited_at else now() end,deleted_at=case when _delete then now() else null end where id=_id and pair_id=_pair and sender_id=me and deleted_at is null returning * into msg;
 if not found then raise exception 'Mensagem indisponível' using errcode='42501';end if;return to_jsonb(msg);
end $$;
revoke all on function public.entre_message_mutate(uuid,bigint,text,boolean) from public,anon;
grant execute on function public.entre_message_mutate(uuid,bigint,text,boolean) to authenticated;
CREATE OR REPLACE FUNCTION public.entre_find_mode_location(_preference text, _mode text, _target_state text, _target_city text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid := (select auth.uid());
 me public.entre_profiles%rowtype;
 candidate uuid;
 current_pair uuid;
 me_state text;
 me_city text;
 target_uf text := nullif(upper(trim(coalesce(_target_state,''))),'');
 target_city_name text := nullif(trim(coalesce(_target_city,'')),'');
begin
 if uid is null then raise exception 'Sessão inválida' using errcode='42501';end if;
 if public.entre_maintenance_active() then raise exception 'O entre. está em atualização.';end if;
 if _preference not in ('woman','man','nonbinary','any') then raise exception 'Preferência inválida';end if;
 if _mode not in ('chat','video') then raise exception 'Modo inválido';end if;
 if _preference<>'any' and not public.entre_premium_active(uid) then raise exception 'O filtro específico requer Premium' using errcode='42501';end if;
 if public.entre_is_banned() then raise exception 'Conta suspensa' using errcode='42501';end if;
 if not coalesce((select matchmaking_enabled from public.entre_site_settings where id=1),true)
  then raise exception 'Novas conexões estão temporariamente pausadas.';end if;
 if target_city_name is not null and target_uf is null then raise exception 'Selecione o estado da cidade';end if;
 if target_uf is not null and target_uf not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
 then raise exception 'Estado de busca inválido';end if;
 if target_city_name is not null and (char_length(target_city_name) not between 2 and 100 or target_city_name ~ '[<>[:cntrl:]]')
 then raise exception 'Cidade de busca inválida';end if;

 perform pg_advisory_xact_lock(53012026);
 select * into me from public.entre_profiles where id=uid;
 if not found then raise exception 'Complete seu perfil antes de conectar';end if;
 select state_code,city_name into me_state,me_city from public.entre_member_locations where user_id=uid;
 -- Searches by location must be reciprocal. The user's own city/state is needed
 -- to honor the other participant's geographic requirements.
 if target_uf is not null and me_state is null then
  raise exception 'Salve sua cidade e estado antes de usar filtros de proximidade';end if;

 update public.entre_pairs set status='closed',closed_at=now()
 where status='active' and expires_at<=now() and (a=uid or b=uid);
 select p.id into current_pair from public.entre_pairs p
 where p.status='active' and p.expires_at>now() and (p.a=uid or p.b=uid)
 order by p.created_at desc limit 1;
 if current_pair is not null then
  delete from public.entre_queue where user_id=uid;
  return jsonb_build_object('status','matched','pair_id',current_pair);
 end if;

 insert into public.entre_queue(user_id,preference,mode,target_state,target_city,joined_at,last_seen)
 values(uid,_preference,_mode,target_uf,target_city_name,now(),now())
 on conflict(user_id) do update set preference=excluded.preference,mode=excluded.mode,
 target_state=excluded.target_state,target_city=excluded.target_city,last_seen=now();

 select q.user_id into candidate from public.entre_queue q
 join public.entre_profiles other on other.id=q.user_id
 left join public.entre_member_locations ol on ol.user_id=q.user_id
 where q.user_id<>uid and q.mode=_mode and q.last_seen>now()-interval '25 seconds'
  and (_preference='any' or other.gender=_preference)
  and (q.preference='any' or q.preference=me.gender)
  and (target_uf is null or ol.state_code=target_uf)
  and (target_city_name is null or lower(ol.city_name)=lower(target_city_name))
  and (q.target_state is null or q.target_state=me_state)
  and (q.target_city is null or lower(q.target_city)=lower(me_city))
  and not exists(select 1 from public.entre_moderation m where m.user_id=q.user_id and m.is_banned)
  and not exists(select 1 from public.entre_blocks x where (x.blocker=uid and x.blocked=q.user_id) or(x.blocker=q.user_id and x.blocked=uid))
  and not exists(select 1 from public.entre_pairs r where (r.a=q.user_id or r.b=q.user_id) and r.status='active' and r.expires_at>now())
  and not exists(select 1 from public.entre_follows f where f.status='accepted' and ((f.follower=uid and f.followed=q.user_id) or (f.followed=uid and f.follower=q.user_id)))
 order by q.joined_at asc,q.user_id asc limit 1;
 if candidate is not null then
  insert into public.entre_pairs(a,b,mode) values(candidate,uid,_mode) returning id into current_pair;
  delete from public.entre_queue where user_id in(uid,candidate);
  return jsonb_build_object('status','matched','pair_id',current_pair);
 end if;
 return jsonb_build_object('status','waiting');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.entre_chat_unread()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_object_agg(x.pair_id,x.total),'{}'::jsonb) from (
 select p.id pair_id,count(m.id) total from public.entre_pairs p join public.entre_messages m on m.pair_id=p.id
 left join public.entre_chat_read_cursor r on r.user_id=auth.uid() and r.pair_id=p.id
 left join public.entre_conversation_prefs f on f.user_id=auth.uid() and f.pair_id=p.id
 where auth.uid() is not null and not public.entre_is_banned() and not public.entre_maintenance_active() and p.status='connected' and (p.a=auth.uid() or p.b=auth.uid()) and m.deleted_at is null and m.sender_id<>auth.uid() and m.id>greatest(coalesce(r.last_id,0),coalesce(f.cleared_through_id,0))
 group by p.id) x
$function$
;
create table public.entre_support_replies(id bigint generated always as identity primary key,ticket_id bigint not null references public.entre_support_tickets(id) on delete cascade,author_id uuid references auth.users(id) on delete set null,from_staff boolean not null,body text not null check(length(trim(body)) between 1 and 4000),created_at timestamptz not null default now());
alter table public.entre_support_replies enable row level security;
revoke all on public.entre_support_replies from public,anon,authenticated;
grant select on public.entre_support_replies to authenticated;
create policy support_reply_reader on public.entre_support_replies for select to authenticated using ((select public.entre_admin_check()) or exists(select 1 from public.entre_support_tickets t where t.id=ticket_id and t.owner_id=(select auth.uid())));
create function public.entre_support_reply(_ticket bigint,_body text,_resolve boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); staff boolean:=public.entre_admin_check(); t public.entre_support_tickets%rowtype;
begin
 if me is null or public.entre_is_banned() then raise exception 'Acesso negado' using errcode='42501';end if;
 select * into t from public.entre_support_tickets where id=_ticket for update;
 if not found or t.status='draft' or (not staff and t.owner_id<>me) then raise exception 'Acesso negado' using errcode='42501';end if;
 if length(trim(coalesce(_body,''))) not between 1 and 4000 then raise exception 'Resposta inválida';end if;
 if (select count(*) from public.entre_support_replies where author_id=me and created_at>now()-interval '1 minute')>=10 then raise exception 'Aguarde antes de responder';end if;
 insert into public.entre_support_replies(ticket_id,author_id,from_staff,body) values(_ticket,me,staff,trim(_body));
 update public.entre_support_tickets set status=case when staff and _resolve then 'resolved' when staff then 'reviewing' else 'submitted' end where id=_ticket;
end $$;
create function public.entre_support_thread(_ticket bigint) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.entre_support_tickets t where id=_ticket and status<>'draft' and (owner_id=auth.uid() or public.entre_admin_check())) then raise exception 'Acesso negado' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]'::jsonb) from (select id,from_staff,body,created_at from public.entre_support_replies where ticket_id=_ticket order by id desc limit 100)x);
end $$;
revoke all on function public.entre_support_reply(bigint,text,boolean),public.entre_support_thread(bigint) from public,anon;
grant execute on function public.entre_support_reply(bigint,text,boolean),public.entre_support_thread(bigint) to authenticated;
alter publication supabase_realtime add table public.entre_support_replies;
commit;