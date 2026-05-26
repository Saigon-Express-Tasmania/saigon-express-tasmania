-- User profiles, roles, auth metadata sync, and JWT role helpers.

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('none', 'user', 'admin', 'partner');
comment on type public.user_role is
  'Application role: none (no access), user (default), admin, partner.';
-- ---------------------------------------------------------------------------
-- Profiles table
-- ---------------------------------------------------------------------------
create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  display_name text generated always as (
    nullif(trim(both from coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
  ) stored,
  date_of_birth date,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  suburb text,
  state text,
  postal_code text,
  country text default 'AU',
  avatar_url text,
  user_role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_email_lowercase check (
    email is null or email = lower(email)
  ),
  constraint user_profiles_dob_reasonable check (
    date_of_birth is null
    or (date_of_birth >= date '1900-01-01' and date_of_birth <= current_date)
  )
);
comment on table public.user_profiles is
  'Extended profile for auth.users; user_role is mirrored into auth JWT metadata.';
create index user_profiles_user_role_idx on public.user_profiles (user_role);
create index user_profiles_email_idx on public.user_profiles (email);
-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row
  execute function public.set_updated_at();
-- ---------------------------------------------------------------------------
-- Auth metadata sync (app + user metadata for JWT claims)
-- ---------------------------------------------------------------------------
create or replace function public.sync_auth_user_role_metadata(
  target_user_id uuid,
  role public.user_role
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  role_text text := role::text;
begin
  update auth.users
  set
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('user_role', role_text),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('user_role', role_text)
  where id = target_user_id;
end;
$$;
comment on function public.sync_auth_user_role_metadata(uuid, public.user_role) is
  'Writes user_role into auth.users app_metadata and user_metadata (JWT claims).';
-- New auth user → profile row + metadata
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.user_profiles (id, email, user_role)
  values (
    new.id,
    lower(new.email),
    'user'::public.user_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    updated_at = now();

  perform public.sync_auth_user_role_metadata(new.id, 'user'::public.user_role);

  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
-- Profile role change → auth metadata
create or replace function public.handle_user_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'UPDATE' and new.user_role is distinct from old.user_role then
    perform public.sync_auth_user_role_metadata(new.id, new.user_role);
  end if;

  return new;
end;
$$;
create trigger on_user_profile_role_change
  after update of user_role on public.user_profiles
  for each row
  execute function public.handle_user_profile_role_change();
-- Keep profile email in sync when auth email changes
create or replace function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.user_profiles
    set
      email = lower(new.email),
      updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row
  execute function public.handle_auth_user_email_change();
-- ---------------------------------------------------------------------------
-- JWT role helpers (read from decoded JWT in RLS / SQL)
-- ---------------------------------------------------------------------------
create or replace function public.auth_user_role()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'user_role', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'user_role', ''),
    'none'
  );
$$;
comment on function public.auth_user_role() is
  'Role from JWT app_metadata/user_metadata; defaults to none if missing.';
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.auth_user_role() = 'admin';
$$;
create or replace function public.is_partner()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.auth_user_role() = 'partner';
$$;
create or replace function public.is_user()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.auth_user_role() = 'user';
$$;
comment on function public.is_admin() is 'True when JWT user_role is admin.';
comment on function public.is_partner() is 'True when JWT user_role is partner.';
-- Only admins (or service role) may change user_role via API
create or replace function public.enforce_user_role_change_policy()
returns trigger
language plpgsql
as $$
begin
  if new.user_role is distinct from old.user_role then
    if auth.role() is distinct from 'service_role' and not public.is_admin() then
      raise exception 'Only admins can change user_role'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
create trigger user_profiles_enforce_role_change
  before update of user_role on public.user_profiles
  for each row
  execute function public.enforce_user_role_change_policy();
-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.user_profiles enable row level security;
create policy "Users can view own profile"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = id);
create policy "Admins can view all profiles"
  on public.user_profiles
  for select
  to authenticated
  using (public.is_admin());
create policy "Partners can view all profiles"
  on public.user_profiles
  for select
  to authenticated
  using (public.is_partner());
create policy "Users can update own profile"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
create policy "Admins can update all profiles"
  on public.user_profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, update on public.user_profiles to authenticated;
grant all on public.user_profiles to service_role;
grant execute on function public.auth_user_role() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_partner() to anon, authenticated, service_role;
grant execute on function public.is_user() to anon, authenticated, service_role;
grant execute on function public.sync_auth_user_role_metadata(uuid, public.user_role)
  to service_role;
