-- High-traffic foreign keys used by feed, moderation, lives and media.
-- Narrow indexes avoid changes to existing RLS/RPC behavior.
create index if not exists entre_posts_author_fk_idx on public.entre_posts(author_id);
create index if not exists entre_post_likes_user_fk_idx on public.entre_post_likes(user_id);
create index if not exists entre_post_comments_author_fk_idx on public.entre_post_comments(author_id);
create index if not exists entre_lives_guest_fk_idx on public.entre_lives(guest_id);
create index if not exists entre_lives_guest_request_fk_idx on public.entre_lives(guest_requested_by);
create index if not exists entre_support_owner_fk_idx on public.entre_support_tickets(owner_id);
create index if not exists entre_notifications_bulletin_fk_idx on public.entre_notifications(bulletin_id);
create index if not exists entre_reports_reviewed_by_fk_idx on public.entre_reports(reviewed_by);