-- Trigger must never be an untrusted public RPC. It runs only from moderation table changes.
revoke all on function public.entre_notify_moderation_change() from public,anon,authenticated;