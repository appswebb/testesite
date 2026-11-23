-- 2026-11-23 CONNECT: comment ownership, moderation and account notices.
alter table public.entre_post_comments add column if not exists edited_at timestamptz;

create table if not exists public.entre_comment_reports (
 id bigint generated always as identity primary key,
 comment_id bigint not null references public.entre_post_comments(id) on delete cascade,
 post_id bigint not null references public.entre_posts(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reported_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check (reason in ('spam','abuse','hate','other')),
 details text not null default '' check(char_length(details)<=600),
 status text not null default 'open' check(status in ('open','reviewed','dismissed')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete set null,
 unique(comment_id,reporter_id)
);
alter table public.entre_comment_reports enable row level security;
revoke all on public.entre_comment_reports from public, anon, authenticated;
create index if not exists entre_comment_reports_status_idx on public.entre_comment_reports(status,created_at desc);

create or replace function public.entre_post_comment_edit(_comment bigint,_body text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=auth.uid(); changed bigint;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 if char_length(btrim(coalesce(_body,''))) not between 2 and 420 then raise exception 'Comentário precisa ter de 2 a 420 caracteres';end if;
 update public.entre_post_comments set body=btrim(_body),edited_at=now()
 where id=_comment and author_id=uid returning id into changed;
 if changed is null then raise exception 'Comentário não encontrado ou sem permissão' using errcode='42501';end if;
 return jsonb_build_object('id',changed,'edited',true);
end $$;
revoke all on function public.entre_post_comment_edit(bigint,text) from public,anon;
grant execute on function public.entre_post_comment_edit(bigint,text) to authenticated;

create or replace function public.entre_post_comment_delete(_comment bigint)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=auth.uid(); removed bigint;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 delete from public.entre_post_comments where id=_comment and author_id=uid returning id into removed;
 if removed is null then raise exception 'Comentário não encontrado ou sem permissão' using errcode='42501';end if;
 return jsonb_build_object('id',removed,'deleted',true);
end $$;
revoke all on function public.entre_post_comment_delete(bigint) from public,anon;
grant execute on function public.entre_post_comment_delete(bigint) to authenticated;

create or replace function public.entre_post_comment_report(_comment bigint,_reason text,_details text default '')
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare uid uuid:=auth.uid(); p_id bigint; owner uuid; report_id bigint;
begin
 if uid is null or public.entre_is_banned() or public.entre_maintenance_active() then raise exception 'Acesso indisponível' using errcode='42501';end if;
 if _reason not in ('spam','abuse','hate','other') or char_length(coalesce(_details,''))>600
 then raise exception 'Dados da denúncia inválidos';end if;
 select c.post_id,c.author_id into p_id,owner from public.entre_post_comments c where c.id=_comment;
 if owner is null or owner=uid then raise exception 'Não é possível denunciar este comentário';end if;
 if (select count(*) from public.entre_comment_reports r where reporter_id=uid and created_at>now()-interval '24 hours')>=20
 then raise exception 'Limite diário de denúncias atingido';end if;
 insert into public.entre_comment_reports(comment_id,post_id,reporter_id,reported_id,reason,details)
 values(_comment,p_id,uid,owner,_reason,btrim(coalesce(_details,'')))
 on conflict(comment_id,reporter_id) do update set reason=excluded.reason,details=excluded.details
 returning id into report_id;
 return jsonb_build_object('id',report_id,'status','open');
end $$;
revoke all on function public.entre_post_comment_report(bigint,text,text) from public,anon;
grant execute on function public.entre_post_comment_report(bigint,text,text) to authenticated;

create or replace function public.entre_admin_comment_reports()
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare out_rows jsonb;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb)
 into out_rows from (
  select r.id,r.comment_id,r.post_id,r.reason,r.details,r.status,r.created_at,
    coalesce(p.display_name,'Conta indisponível') as reported_name,
    coalesce(q.display_name,'Conta indisponível') as reporter_name,
    left(coalesce(c.body,'Comentário removido'),420) comment_body
  from public.entre_comment_reports r
  left join public.entre_post_comments c on c.id=r.comment_id
  left join public.entre_profiles p on p.id=r.reported_id
  left join public.entre_profiles q on q.id=r.reporter_id
  order by r.created_at desc limit 80
 ) t;
 return out_rows;
end $$;
revoke all on function public.entre_admin_comment_reports() from public,anon,authenticated;
grant execute on function public.entre_admin_comment_reports() to authenticated;

create or replace function public.entre_admin_review_comment_report(_id bigint,_status text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare changed bigint;
begin
 if not public.entre_admin_check() then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 if _status not in ('reviewed','dismissed') then raise exception 'Status inválido';end if;
 update public.entre_comment_reports set status=_status,reviewed_by=auth.uid(),reviewed_at=now()
 where id=_id returning id into changed;
 if changed is null then raise exception 'Denúncia não encontrada';end if;
 return jsonb_build_object('id',changed,'status',_status);
end $$;
revoke all on function public.entre_admin_review_comment_report(bigint,text) from public,anon,authenticated;
grant execute on function public.entre_admin_review_comment_report(bigint,text) to authenticated;

alter table public.entre_notifications drop constraint if exists entre_notifications_kind_check;
alter table public.entre_notifications add constraint entre_notifications_kind_check
check(kind in ('follow','follow_accepted','chat_request','chat_accepted','message','matched','ended','retention','system','bulletin','poll','bulletin_reply','account_suspended','account_restored'));

create or replace function public.entre_notify_moderation_change()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
 if tg_op='INSERT' and new.is_banned or
    tg_op='UPDATE' and old.is_banned is distinct from new.is_banned then
   insert into public.entre_notifications(user_id,actor_id,kind)
   values(new.user_id,null,case when new.is_banned then 'account_suspended' else 'account_restored' end);
 end if;
 return new;
end $$;
drop trigger if exists entre_moderation_notify_trigger on public.entre_moderation;
create trigger entre_moderation_notify_trigger
 after insert or update of is_banned on public.entre_moderation
 for each row execute function public.entre_notify_moderation_change();
