-- Accounts are owned by Supabase Auth. Clients can never assign membership.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (length(name) <= 100),
  gender text check (gender in ('Male', 'Female', 'Other', 'Prefer not to say')),
  partner_nickname text not null default '' check (length(partner_nickname) <= 100),
  created_at timestamptz not null default now()
);
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table public.couple_members (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  unique (couple_id, slot)
);
create index couple_members_couple_idx on public.couple_members(couple_id);
create table private.partner_invites (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  code_hash bytea not null unique,
  expires_at timestamptz not null
);
create table private.link_attempts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table private.partner_invites enable row level security;
alter table private.link_attempts enable row level security;

create function public.is_couple_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.couple_members where couple_id = target and profile_id = auth.uid());
$$;
revoke all on function public.is_couple_member(uuid) from public, anon;
grant execute on function public.is_couple_member(uuid) to authenticated;
create policy own_profile_read on public.profiles for select to authenticated using (id = auth.uid());
create policy own_profile_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy couple_read on public.couples for select to authenticated using (public.is_couple_member(id));
create policy member_read on public.couple_members for select to authenticated using (public.is_couple_member(couple_id));
revoke all on public.profiles, public.couples, public.couple_members from anon, authenticated;
grant select on public.profiles, public.couples, public.couple_members to authenticated;
grant update (name, gender, partner_nickname) on public.profiles to authenticated;

create function private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, name) values (new.id, left(split_part(coalesce(new.email, ''), '@', 1), 100));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();
-- Also supports applying the migration to a project that already has users.
insert into public.profiles(id, name) select id, left(split_part(coalesce(email, ''), '@', 1), 100) from auth.users on conflict do nothing;

create function public.create_partner_invite() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid(); code text; expiry timestamptz := now() + interval '24 hours';
begin
  if me is null then raise exception 'Authentication required'; end if;
  perform 1 from public.profiles where id = me and gender is not null and length(trim(partner_nickname)) > 0 for update;
  if not found then return jsonb_build_object('error', 'Complete your profile first.'); end if;
  if exists (select 1 from public.couple_members where profile_id = me) then
    return jsonb_build_object('error', 'You are already linked.');
  end if;
  code := encode(extensions.gen_random_bytes(12), 'hex');
  insert into private.partner_invites(owner_id, code_hash, expires_at)
    values (me, extensions.digest(code, 'sha256'), expiry)
    on conflict (owner_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at;
  return jsonb_build_object('code', code, 'expires_at', expiry);
end;
$$;

create function public.accept_partner_invite(invite_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid(); owner uuid; target uuid; tries integer;
begin
  if me is null then raise exception 'Authentication required'; end if;
  -- One transaction serializes attempts per user, including invalid-code attempts.
  insert into private.link_attempts(user_id) values (me) on conflict do nothing;
  update private.link_attempts set
    attempts = case when started_at < now() - interval '15 minutes' then 1 else attempts + 1 end,
    started_at = case when started_at < now() - interval '15 minutes' then now() else started_at end
    where user_id = me returning attempts into tries;
  if tries > 10 then return jsonb_build_object('error', 'Too many attempts. Try again in 15 minutes.'); end if;
  if invite_code is null or lower(trim(invite_code)) !~ '^[0-9a-f]{24}$' then
    return jsonb_build_object('error', 'This invitation is invalid or expired.');
  end if;
  select owner_id into owner from private.partner_invites
    where code_hash = extensions.digest(lower(trim(invite_code)), 'sha256') and expires_at > now();
  if owner is null or owner = me then return jsonb_build_object('error', 'This invitation is invalid or expired.'); end if;
  -- Both profiles are locked in stable order, preventing cross-invite races/deadlocks.
  perform 1 from public.profiles where id in (me, owner) order by id for update;
  if not exists (select 1 from public.profiles where id = me and gender is not null and length(trim(partner_nickname)) > 0) then
    return jsonb_build_object('error', 'Complete your profile first.');
  end if;
  if exists (select 1 from public.couple_members where profile_id in (me, owner)) then
    return jsonb_build_object('error', 'One of you is already linked.');
  end if;
  -- Recheck after acquiring locks: another request may have consumed/replaced it.
  perform 1 from private.partner_invites where owner_id = owner
    and code_hash = extensions.digest(lower(trim(invite_code)), 'sha256') and expires_at > now() for update;
  if not found then return jsonb_build_object('error', 'This invitation is invalid or expired.'); end if;
  insert into public.couples default values returning id into target;
  insert into public.couple_members(profile_id, couple_id, slot) values (owner, target, 1), (me, target, 2);
  delete from private.partner_invites where owner_id in (me, owner);
  return jsonb_build_object('couple_id', target);
end;
$$;
revoke all on function public.create_partner_invite(), public.accept_partner_invite(text) from public, anon;
grant execute on function public.create_partner_invite(), public.accept_partner_invite(text) to authenticated;
