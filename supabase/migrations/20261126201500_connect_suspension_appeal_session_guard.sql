create or replace function public.entre_submit_suspension_appeal(_message text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  sid uuid := nullif(auth.jwt()->>'session_id','')::uuid;
  saved_id bigint;
begin
  if uid is null or sid is null or not exists (
    select 1 from auth.sessions s
    where s.id = sid and s.user_id = uid
      and (s.not_after is null or s.not_after > now())
  ) then
    raise exception 'Sessão inválida' using errcode='42501';
  end if;

  if not exists (
    select 1 from public.entre_moderation m
    where m.user_id = uid and m.is_banned
  ) then
    raise exception 'Esta conta não está suspensa.';
  end if;

  if length(trim(coalesce(_message,''))) not between 15 and 1000 then
    raise exception 'Escreva entre 15 e 1.000 caracteres.';
  end if;

  perform pg_advisory_xact_lock(hashtext(uid::text));

  if exists (
    select 1 from public.entre_suspension_appeals
    where user_id = uid and created_at > now() - interval '24 hours'
  ) then
    raise exception 'Você já enviou uma contestação nas últimas 24 horas.';
  end if;

  insert into public.entre_suspension_appeals(user_id,message)
  values(uid,trim(_message))
  returning id into saved_id;

  return jsonb_build_object('id',saved_id,'status','pending');
end
$function$;