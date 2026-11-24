-- Verified duplicate partial index; keep entre_lives_recent which covers the same (started_at DESC) predicate.
drop index if exists public.entre_lives_active_discovery;
