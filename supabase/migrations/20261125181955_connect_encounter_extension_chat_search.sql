-- One mutually accepted five-minute extension, with server-authoritative expiry.
alter table public.entre_pairs add column if not exists extension_a boolean not null default false;
alter table public.entre_pairs add column if not exists extension_b boolean not null default false;
alter table public.entre_pairs add column if not exists extended_at timestamptz;
create function public.connect_encounter_extend(_pair uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.entre_pairs%rowtype; u uuid:=auth.uid();
begin
 if not public.entre_chat_pair_allowed(_pair) then raise exception 'Encontro indisponível'; end if;
 select * into v from public.entre_pairs where id=_pair and (a=u or b=u) and status='active' and expires_at>now() for update;
 if not found then raise exception 'Encontro encerrado'; end if;
 if v.extended_at is not null then return jsonb_build_object('status','extended','expires_at',v.expires_at);end if;
 update public.entre_pairs set extension_a=extension_a or a=u,extension_b=extension_b or b=u where id=_pair returning * into v;
 if v.extension_a and v.extension_b then
 update public.entre_pairs set extended_at=now(),expires_at=expires_at+interval '5 minutes' where id=_pair returning * into v;
 end if;
 perform public.connect_emit_account_signal(v.a,'pair');
 perform public.connect_emit_account_signal(v.b,'pair');
 return jsonb_build_object('status',case when v.extended_at is not null then 'extended' else 'waiting' end,'expires_at',v.expires_at);
end $$;
create function public.connect_encounter_expire(_pair uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão inválida';end if;
 update public.entre_pairs set status='closed',closed_at=now() where id=_pair and (a=auth.uid() or b=auth.uid()) and status='active' and expires_at<=now();
 return found;
end $$;
revoke all on function public.connect_encounter_extend(uuid),public.connect_encounter_expire(uuid) from public,anon;
grant execute on function public.connect_encounter_extend(uuid),public.connect_encounter_expire(uuid) to authenticated;
-- Search only messages visible to the signed-in participant, never hidden/deleted text.
create function public.connect_chat_search(_pair uuid,_query text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q text:=btrim(coalesce(_query,''));
begin
 if not public.entre_chat_pair_allowed(_pair) or not exists(select 1 from public.entre_pairs where id=_pair and status='connected') then raise exception 'Conversa indisponível';end if;
 if length(q) not between 2 and 80 then raise exception 'Digite de 2 a 80 caracteres';end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.id desc) from (select m.id,m.sender_id,m.body,m.created_at from public.entre_messages m where m.pair_id=_pair and m.deleted_at is null and public.entre_message_visible_for_member(_pair,m.id) and strpos(lower(m.body),lower(q))>0 order by m.id desc limit 50)x),'[]'::jsonb);
end $$;
revoke all on function public.connect_chat_search(uuid,text) from public,anon;
grant execute on function public.connect_chat_search(uuid,text) to authenticated;
-- Cascade new social data on deletion of a CONNECT profile even if the Auth identity survives.
alter table public.connect_moments add constraint connect_moments_profile_fk foreign key(author_id) references public.entre_profiles(id) on delete cascade;
alter table public.connect_moment_likes add constraint connect_moment_likes_profile_fk foreign key(user_id) references public.entre_profiles(id) on delete cascade;
alter table public.connect_moment_comments add constraint connect_moment_comments_profile_fk foreign key(author_id) references public.entre_profiles(id) on delete cascade;
alter table public.connect_moment_reports add constraint connect_moment_reports_reporter_profile_fk foreign key(reporter_id) references public.entre_profiles(id) on delete cascade;
alter table public.connect_moment_reports add constraint connect_moment_reports_author_profile_fk foreign key(author_id) references public.entre_profiles(id) on delete cascade;
alter table public.connect_discovery_profiles add constraint connect_discovery_profile_fk foreign key(user_id) references public.entre_profiles(id) on delete cascade;
