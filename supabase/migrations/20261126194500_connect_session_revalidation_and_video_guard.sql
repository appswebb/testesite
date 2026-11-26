create or replace function public.entre_is_banned()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.uid()) is not null
    and (
      not exists (
        select 1 from auth.users u
        where u.id = (select auth.uid())
      )
      or not exists (
        select 1
        from auth.sessions s
        where s.id = nullif(auth.jwt()->>'session_id', '')::uuid
          and s.user_id = (select auth.uid())
          and (s.not_after is null or s.not_after > now())
      )
      or exists (
        select 1
        from public.entre_moderation m
        where m.user_id = (select auth.uid())
          and m.is_banned
      )
    );
$function$;

create or replace function public.entre_admin_check()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from auth.users u
    join public.entre_admin_allowlist a
      on a.email = lower(u.email) and a.enabled = true
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and coalesce(u.is_anonymous, false) = false
      and exists (
        select 1 from auth.identities i
        where i.user_id = u.id and i.provider = 'email'
      )
      and exists (
        select 1
        from auth.sessions s
        where s.id = nullif(auth.jwt()->>'session_id', '')::uuid
          and s.user_id = u.id
          and (s.not_after is null or s.not_after > now())
      )
  );
$function$;

create or replace function public.entre_video_channel_allowed(_topic text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select auth.uid() is not null and exists (
    select 1
    from public.entre_pairs p
    where _topic = 'entre_video_' || p.id::text
      and p.mode = 'video'
      and p.status = 'active'
      and p.expires_at > now()
      and (p.a = auth.uid() or p.b = auth.uid())
      and public.entre_chat_pair_allowed(p.id)
  );
$function$;

comment on function public.entre_is_banned() is
  'Rejects banned users, deleted Auth identities, and revoked or expired sessions.';
comment on function public.entre_admin_check() is
  'Admin allowlist check requiring a verified email identity and a currently active Auth session.';
comment on function public.entre_video_channel_allowed(text) is
  'Allows temporary video signaling only for active, unexpired, unblocked, non-banned sessions.';