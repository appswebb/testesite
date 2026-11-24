-- Focused index maintenance based on Supabase FK performance advisor.
-- Safe to rerun; no permissions, RLS or existing rows are changed.
create index if not exists entre_admin_delete_actor_fk_idx on public.entre_admin_deletion_audit(actor_id);
create index if not exists entre_bulletin_replies_user_fk_idx on public.entre_bulletin_replies(user_id);
create index if not exists entre_bulletin_votes_user_fk_idx on public.entre_bulletin_votes(user_id);
create index if not exists entre_bulletins_author_fk_idx on public.entre_bulletins(author_id);
create index if not exists entre_comment_reports_post_fk_idx on public.entre_comment_reports(post_id);
create index if not exists entre_comment_reports_reported_fk_idx on public.entre_comment_reports(reported_id);
create index if not exists entre_comment_reports_reporter_fk_idx on public.entre_comment_reports(reporter_id);
create index if not exists entre_comment_reports_reviewer_fk_idx on public.entre_comment_reports(reviewed_by);
create index if not exists entre_moderation_updater_fk_idx on public.entre_moderation(updated_by);
create index if not exists entre_site_settings_updater_fk_idx on public.entre_site_settings(updated_by);