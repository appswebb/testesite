-- Enforce previously banned e-mail addresses even before the hosted Auth Hook is enabled.
create function connect_internal.prevent_banned_email_registration()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email is not null and exists(select 1 from connect_internal.ban_history h where h.released_at is null and h.email_hash=sha256(convert_to(lower(trim(new.email)),'UTF8'))) then
  raise exception 'Cadastro indisponível' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function connect_internal.prevent_banned_email_registration() from public,anon,authenticated;
create trigger connect_block_banned_email_before_signup before insert on auth.users for each row execute function connect_internal.prevent_banned_email_registration();
