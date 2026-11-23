-- Official-only chat rooms: BR, 27 states, and validated state/city choices.
-- No CREATE room API. Messages disappear from reads at exactly 24h; cron purges database each minute.
create table if not exists public.entre_room_messages (
 id bigint generated always as identity primary key,
 room_key text not null check(length(room_key)<=110),
 sender uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(body) between 1 and 400),
 created_at timestamptz not null default now()
);
create index if not exists entre_room_messages_room_recent_idx on public.entre_room_messages(room_key,id desc);
create index if not exists entre_room_messages_sender_recent_idx on public.entre_room_messages(sender,created_at desc);
alter table public.entre_room_messages enable row level security;
revoke all on public.entre_room_messages from public,anon,authenticated;
-- Public rooms are read via protected RPC. Realtime subscribers are not granted table read access.

create or replace function public.entre_room_key(_room text)
returns text language plpgsql immutable set search_path to ''
as $$
declare uf text; city text; valid text[]:=array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO','MG'];
begin
 _room:=lower(btrim(coalesce(_room,'')));
 if _room='br' then return 'br';end if;
 if _room ~ '^s:[a-z]{2}$' then
  uf:=upper(substring(_room from 3));
  if uf=any(valid) then return 's:'||lower(uf);end if;
 end if;
 if _room ~ '^c:[a-z]{2}:[a-z0-9][a-z0-9_-]{1,79}$' then
  uf:=upper(substring(_room from 3 for 2));
  if uf=any(valid) then return _room;end if;
 end if;
 raise exception 'Sala de região inválida' using errcode='22023';
end $$;
revoke all on function public.entre_room_key(text) from public,anon;
grant execute on function public.entre_room_key(text) to authenticated;

create or replace function public.entre_room_messages_page(_room text,_before bigint default null)
returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); key text; items jsonb; has_more boolean;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then
  raise exception 'Sala indisponível' using errcode='42501'; end if;
 key:=public.entre_room_key(_room);
 with messages as (
  select m.id,m.body,m.sender,m.created_at,
   coalesce(p.display_name,'Pessoa') display_name,p.username,p.avatar_path,p.avatar_uploaded_at,
   row_number() over(order by m.id desc) rn
  from public.entre_room_messages m
  join public.entre_profiles p on p.id=m.sender
  where m.room_key=key and m.created_at>now()-interval '24 hours'
   and (_before is null or m.id<_before)
   and not exists(select 1 from public.entre_moderation md where md.user_id=m.sender and md.is_banned)
   and not exists(select 1 from public.entre_blocks b where
    (b.blocker=me and b.blocked=m.sender) or (b.blocker=m.sender and b.blocked=me))
  order by m.id desc limit 41
 )
 select coalesce(jsonb_agg(to_jsonb(x)-'rn' order by x.id desc) filter(where x.rn<=40),'[]'::jsonb),
 coalesce(bool_or(x.rn>40),false) into items,has_more from messages x;
 return jsonb_build_object('items',items,'has_more',has_more,'room',key,'ttl_hours',24);
end $$;
revoke all on function public.entre_room_messages_page(text,bigint) from public,anon;
grant execute on function public.entre_room_messages_page(text,bigint) to authenticated;

create or replace function public.entre_room_send(_room text,_body text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); key text; last_sent timestamptz; inserted bigint; retry_ms integer;
begin
 if me is null or public.entre_is_banned() or public.entre_maintenance_active() then
  raise exception 'Envio indisponível' using errcode='42501'; end if;
 key:=public.entre_room_key(_room);
 _body:=btrim(coalesce(_body,''));
 if length(_body)<1 or length(_body)>400 then raise exception 'Use entre 1 e 400 caracteres';end if;
 -- Transaction scoped lock prevents parallel messages evading the cooldown.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text,28711));
 select max(created_at) into last_sent from public.entre_room_messages where sender=me and created_at>now()-interval '5 seconds';
 if last_sent is not null then
  retry_ms:=greatest(1,ceil(extract(epoch from last_sent+interval '5 seconds'-now())*1000)::integer);
  raise exception 'Aguarde 5 segundos antes de enviar outra mensagem (% ms).',retry_ms using errcode='P0001';
 end if;
 insert into public.entre_room_messages(room_key,sender,body) values(key,me,_body) returning id into inserted;
 return jsonb_build_object('id',inserted,'room',key,'cooldown_seconds',5);
end $$;
revoke all on function public.entre_room_send(text,text) from public,anon;
grant execute on function public.entre_room_send(text,text) to authenticated;

create or replace function public.entre_room_delete_my_message(_id bigint)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare me uuid:=auth.uid(); count_deleted integer;
begin
 if me is null then raise exception 'Faça login' using errcode='42501';end if;
 delete from public.entre_room_messages where id=_id and sender=me;
 get diagnostics count_deleted=row_count;
 return count_deleted>0;
end $$;
revoke all on function public.entre_room_delete_my_message(bigint) from public,anon;
grant execute on function public.entre_room_delete_my_message(bigint) to authenticated;

create or replace function public.entre_expire_room_messages()
returns void language plpgsql security definer set search_path to ''
as $$
begin
 delete from public.entre_room_messages where created_at<=now()-interval '24 hours';
end $$;
revoke all on function public.entre_expire_room_messages() from public,anon,authenticated;
do $$
begin
 if exists(select 1 from cron.job where jobname='entre-room-messages-24h') then
   perform cron.unschedule('entre-room-messages-24h');
 end if;
 perform cron.schedule('entre-room-messages-24h','* * * * *','select public.entre_expire_room_messages();');
end $$;
