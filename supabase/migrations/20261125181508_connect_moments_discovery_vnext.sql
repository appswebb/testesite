-- CONNECT vNext: isolated, bounded ephemeral clips and opt-in discovery.
create table public.connect_moments (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 path text not null unique,
 caption text not null default '' check(length(caption)<=180),
 status text not null default 'pending' check(status in ('pending','published','removed')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '15 minutes'
);
create index connect_moments_expiry on public.connect_moments(expires_at);
create index connect_moments_owner on public.connect_moments(author_id,created_at desc);
create table public.connect_moment_likes (
 moment_id uuid not null references public.connect_moments(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(moment_id,user_id)
);
create table public.connect_moment_comments (
 id bigint generated always as identity primary key,
 moment_id uuid not null references public.connect_moments(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(body) between 2 and 300),
 created_at timestamptz not null default now()
);
create index connect_moment_comments_idx on public.connect_moment_comments(moment_id,id desc);
create index connect_moment_comments_owner on public.connect_moment_comments(author_id,created_at);
create table public.connect_moment_reports (
 id bigint generated always as identity primary key,
 moment_id uuid references public.connect_moments(id) on delete set null,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(reason in ('harassment','hate','spam','underage','fake','other')),
 status text not null default 'open' check(status in ('open','reviewed','dismissed')),
 created_at timestamptz not null default now(),
 unique(moment_id,reporter_id)
);
create index connect_moment_reports_status on public.connect_moment_reports(status,created_at desc);
create index connect_moment_reports_author on public.connect_moment_reports(author_id);
create index connect_moment_reports_reporter on public.connect_moment_reports(reporter_id,created_at);
create table public.connect_discovery_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 interests text[] not null default '{}' check(cardinality(interests)<=8),
 goal text not null default 'conversar' check(goal in ('amizade','relacionamento','conversar','comunidade')),
 visible boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.connect_moments enable row level security;
alter table public.connect_moment_likes enable row level security;
alter table public.connect_moment_comments enable row level security;
alter table public.connect_moment_reports enable row level security;
alter table public.connect_discovery_profiles enable row level security;
revoke all on public.connect_moments,public.connect_moment_likes,public.connect_moment_comments,public.connect_moment_reports,public.connect_discovery_profiles from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('connect-moments','connect-moments',false,6291456,array['video/mp4','video/webm']);
create function public.connect_vnext_member() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not public.entre_is_banned() and not public.entre_maintenance_active()
 and exists(select 1 from public.entre_profiles p where p.id=auth.uid() and p.onboarding_plan_selected)
$$;
create function public.connect_vnext_visible(_author uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.connect_vnext_member() and not exists(select 1 from public.entre_moderation m where m.user_id=_author and m.is_banned)
 and not exists(select 1 from public.entre_blocks b where (b.blocker=auth.uid() and b.blocked=_author) or (b.blocker=_author and b.blocked=auth.uid()))
$$;
create function public.connect_moment_read(_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.connect_moments m where m.path=_path and m.status='published' and m.expires_at>now() and
 (public.connect_vnext_visible(m.author_id) or public.entre_admin_check()))
$$;
create function public.connect_moment_upload(_path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.connect_vnext_member() and exists(select 1 from public.connect_moments m where m.path=_path and m.author_id=auth.uid() and m.status='pending' and m.expires_at>now())
$$;
create policy connect_moment_upload_reserved on storage.objects for insert to authenticated with check(bucket_id='connect-moments' and public.connect_moment_upload(name));
create policy connect_moment_read_active on storage.objects for select to authenticated using(bucket_id='connect-moments' and public.connect_moment_read(name));
create function public.connect_moment_reserve(_format text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); k uuid:=gen_random_uuid(); v text;
begin
 if not public.connect_vnext_member() then raise exception 'Acesso indisponível'; end if;
 if _format not in ('mp4','webm') or _format is null then raise exception 'Formato inválido'; end if;
 perform pg_advisory_xact_lock(82752901);
 if (select count(*) from public.connect_moments where author_id=u and created_at>now()-interval '24 hours')>=3 then raise exception 'Limite de 3 Moments a cada 24 horas'; end if;
 if (select count(*) from storage.objects where bucket_id='connect-moments')+(select count(*) from public.connect_moments where status='pending' and expires_at>now())>=40 then raise exception 'Capacidade temporariamente atingida. Tente mais tarde.'; end if;
 v:=u::text||'/'||k::text||'.'||_format;
 insert into public.connect_moments(id,author_id,path) values(k,u,v);
 return jsonb_build_object('id',k,'path',v);
end $$;
create function public.connect_moment_publish(_id uuid,_caption text) returns boolean language plpgsql security definer set search_path='' as $$
declare m public.connect_moments%rowtype; obj storage.objects%rowtype;
begin
 if not public.connect_vnext_member() or length(coalesce(_caption,''))>180 then raise exception 'Publicação inválida'; end if;
 select * into m from public.connect_moments where id=_id and author_id=auth.uid() and status='pending' and expires_at>now() for update;
 if not found then raise exception 'Reserva expirada'; end if;
 select * into obj from storage.objects where bucket_id='connect-moments' and name=m.path;
 if not found or coalesce(obj.metadata->>'mimetype','') not in ('video/mp4','video/webm') or coalesce((obj.metadata->>'size')::bigint,0) not between 1 and 6291456 or obj.created_at<=now()-interval '24 hours' then raise exception 'Arquivo inválido'; end if;
 update public.connect_moments set caption=btrim(coalesce(_caption,'')),status='published',expires_at=obj.created_at+interval '24 hours' where id=_id;
 return true;
end $$;
create function public.connect_moment_remove(_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.connect_vnext_member() and not public.entre_admin_check() then raise exception 'Acesso indisponível'; end if;
 update public.connect_moments set status='removed',expires_at=least(expires_at,now()) where id=_id and (author_id=auth.uid() or public.entre_admin_check());
 return found;
end $$;
create function public.connect_moments_feed() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.connect_vnext_member() then raise exception 'Acesso indisponível'; end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
 select m.id,m.author_id,m.path,m.caption,m.created_at,m.expires_at,p.display_name,p.username,
 (select count(*) from public.connect_moment_likes l where l.moment_id=m.id) likes,
 exists(select 1 from public.connect_moment_likes l where l.moment_id=m.id and l.user_id=auth.uid()) liked,
 (select count(*) from public.connect_moment_comments c where c.moment_id=m.id and public.connect_vnext_visible(c.author_id)) comments
 from public.connect_moments m join public.entre_profiles p on p.id=m.author_id
 where m.status='published' and m.expires_at>now() and public.connect_vnext_visible(m.author_id)
 and not exists(select 1 from public.connect_moment_reports r where r.moment_id=m.id and r.reporter_id=auth.uid())
 order by m.created_at desc limit 40) x),'[]'::jsonb);
end $$;
create function public.connect_moment_like(_id uuid,_liked boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.connect_moments m where m.id=_id and m.status='published' and m.expires_at>now() and public.connect_vnext_visible(m.author_id)) then raise exception 'Moment indisponível'; end if;
 if _liked then insert into public.connect_moment_likes values(_id,auth.uid()) on conflict do nothing;
 else delete from public.connect_moment_likes where moment_id=_id and user_id=auth.uid(); end if;
 return _liked;
end $$;
create function public.connect_moment_comments_list(_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.connect_moments m where m.id=_id and m.status='published' and m.expires_at>now() and public.connect_vnext_visible(m.author_id)) then raise exception 'Moment indisponível'; end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.id desc) from (select c.id,c.body,c.author_id,c.created_at,p.display_name from public.connect_moment_comments c join public.entre_profiles p on p.id=c.author_id where c.moment_id=_id and public.connect_vnext_visible(c.author_id) order by c.id desc limit 40) x),'[]'::jsonb);
end $$;
create function public.connect_moment_comment(_id uuid,_body text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.connect_moments m where m.id=_id and m.status='published' and m.expires_at>now() and public.connect_vnext_visible(m.author_id)) then raise exception 'Moment indisponível'; end if;
 if length(btrim(coalesce(_body,''))) not between 2 and 300 then raise exception 'Comentário inválido'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 if (select count(*) from public.connect_moment_comments where author_id=auth.uid() and created_at>now()-interval '1 minute')>=5 then raise exception 'Aguarde antes de comentar novamente'; end if;
 insert into public.connect_moment_comments(moment_id,author_id,body) values(_id,auth.uid(),btrim(_body));
 return true;
end $$;
create function public.connect_moment_comment_remove(_id bigint) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.connect_vnext_member() and not public.entre_admin_check() then raise exception 'Acesso indisponível'; end if;
 delete from public.connect_moment_comments where id=_id and (author_id=auth.uid() or public.entre_admin_check()); return found;
end $$;
create function public.connect_moment_report(_id uuid,_reason text) returns boolean language plpgsql security definer set search_path='' as $$
declare a uuid;
begin
 select author_id into a from public.connect_moments where id=_id and status='published' and expires_at>now() and public.connect_vnext_visible(author_id);
 if a is null or a=auth.uid() or _reason not in ('harassment','hate','spam','underage','fake','other') then raise exception 'Denúncia inválida'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,2));
 if (select count(*) from public.connect_moment_reports where reporter_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Limite de denúncias'; end if;
 insert into public.connect_moment_reports(moment_id,reporter_id,author_id,reason) values(_id,auth.uid(),a,_reason) on conflict do nothing; return true;
end $$;
create function public.connect_admin_moments() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.entre_admin_check() then raise exception 'Acesso negado'; end if;
 return jsonb_build_object('clips',coalesce((select jsonb_agg(to_jsonb(x)) from (select m.id,m.path,m.caption,m.expires_at,p.display_name,(select count(*) from public.connect_moment_reports r where r.moment_id=m.id and r.status='open') reports from public.connect_moments m join public.entre_profiles p on p.id=m.author_id where m.status='published' and m.expires_at>now() order by m.created_at desc limit 40)x),'[]'::jsonb),
 'reports',coalesce((select jsonb_agg(to_jsonb(x)) from (select r.id,r.moment_id,r.reason,r.status,r.created_at,p.display_name from public.connect_moment_reports r left join public.entre_profiles p on p.id=r.author_id where r.status='open' order by r.id desc limit 100)x),'[]'::jsonb));
end $$;
create function public.connect_admin_moment_review(_id bigint,_status text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.entre_admin_check() or _status not in ('reviewed','dismissed') then raise exception 'Acesso negado'; end if;
 update public.connect_moment_reports set status=_status where id=_id; return found;
end $$;
create function public.connect_moment_cleanup_candidates() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x.name),'[]'::jsonb) from (select o.name from storage.objects o where o.bucket_id='connect-moments' and
 (o.created_at<=now()-interval '24 hours' or exists(select 1 from public.connect_moments m where m.path=o.name and (m.status='removed' or m.expires_at<=now())) or
 (o.created_at<=now()-interval '15 minutes' and not exists(select 1 from public.connect_moments m where m.path=o.name))) order by o.created_at limit 100)x
$$;
create function public.connect_moment_cleanup_rows() returns integer language plpgsql security definer set search_path='' as $$
declare n int;
begin
 delete from public.connect_moments m where m.created_at<=now()-interval '24 hours' and m.expires_at<=now() and not exists(select 1 from storage.objects o where o.bucket_id='connect-moments' and o.name=m.path);
 get diagnostics n=row_count;
 delete from public.connect_moment_reports where created_at<=now()-interval '7 days';
 return n;
end $$;
create function public.connect_discovery_me() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.connect_vnext_member() then raise exception 'Acesso indisponível'; end if;
 return coalesce((select jsonb_build_object('interests',interests,'goal',goal,'visible',visible) from public.connect_discovery_profiles where user_id=auth.uid()),'{"interests":[],"goal":"conversar","visible":false}'::jsonb);
end $$;
create function public.connect_discovery_save(_interests text[],_goal text,_visible boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.connect_vnext_member() or _interests is null or cardinality(_interests)>8 or not (_interests <@ array['musica','games','cinema','esportes','tecnologia','arte','viagens','livros','pets','gastronomia','fitness','natureza','estudos','fotografia']::text[]) or _goal not in ('amizade','relacionamento','conversar','comunidade') or _visible is null then raise exception 'Preferências inválidas'; end if;
 insert into public.connect_discovery_profiles(user_id,interests,goal,visible) values(auth.uid(),array(select distinct unnest(_interests)),_goal,_visible) on conflict(user_id) do update set interests=excluded.interests,goal=excluded.goal,visible=excluded.visible,updated_at=now();
 return true;
end $$;
create function public.connect_discovery_people() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.connect_vnext_member() then raise exception 'Acesso indisponível'; end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.common desc,x.online desc,x.display_name) from (
 select p.id,p.username,p.display_name,p.age,p.avatar_path,p.avatar_uploaded_at,d.interests,d.goal,
 (select count(*) from unnest(d.interests) t where t=any(coalesce(me.interests,'{}'::text[]))) common,
 coalesce(pr.visible and pr.last_seen>now()-interval '5 minutes',false) online
 from public.connect_discovery_profiles d join public.entre_profiles p on p.id=d.user_id
 left join public.connect_discovery_profiles me on me.user_id=auth.uid() left join public.entre_presence pr on pr.user_id=p.id
 where d.visible and p.id<>auth.uid() and p.onboarding_plan_selected and public.connect_vnext_visible(p.id)
 and not exists(select 1 from public.entre_follows f where f.follower=auth.uid() and f.followed=p.id and f.status='accepted')
 order by common desc,online desc,p.display_name limit 30)x),'[]'::jsonb);
end $$;
-- Explicit access only. Helpers derive the authenticated identity, never accept a caller identity.
do $$ declare f record; begin
 for f in select oid::regprocedure as sig,proname from pg_proc where pronamespace='public'::regnamespace and (proname in ('connect_vnext_member','connect_vnext_visible','connect_moments_feed','connect_admin_moments','connect_admin_moment_review') or proname like 'connect_moment_%' or proname like 'connect_discovery_%') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 if f.proname in ('connect_moment_cleanup_candidates','connect_moment_cleanup_rows') then execute format('grant execute on function %s to service_role',f.sig);
 elsif f.proname not in ('connect_vnext_member','connect_vnext_visible') then execute format('grant execute on function %s to authenticated',f.sig); end if;
 end loop;
end $$;
