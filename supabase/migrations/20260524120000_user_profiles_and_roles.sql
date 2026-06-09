-- User profiles, JWT role helpers, and auth signup sync.
-- Portal privileges live on user_metadata.privileges (user_metadata migration),
-- not on user_profiles.

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
  business_name text,
  abn text,
  business_category text,
  avatar_url text,
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
  'Extended profile for auth.users (contact, business, and address fields).';
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
-- New auth user → profile row populated from signup metadata
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    address_line1,
    business_name,
    abn,
    business_category
  )
  values (
    new.id,
    lower(new.email),
    nullif(trim(meta ->> 'first_name'), ''),
    nullif(trim(meta ->> 'last_name'), ''),
    nullif(trim(meta ->> 'phone'), ''),
    nullif(trim(meta ->> 'address_line1'), ''),
    nullif(trim(meta ->> 'business_name'), ''),
    nullif(trim(meta ->> 'abn'), ''),
    nullif(trim(meta ->> 'business_category'), '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    first_name = coalesce(excluded.first_name, public.user_profiles.first_name),
    last_name = coalesce(excluded.last_name, public.user_profiles.last_name),
    phone = coalesce(excluded.phone, public.user_profiles.phone),
    address_line1 = coalesce(excluded.address_line1, public.user_profiles.address_line1),
    business_name = coalesce(excluded.business_name, public.user_profiles.business_name),
    abn = coalesce(excluded.abn, public.user_profiles.abn),
    business_category = coalesce(
      excluded.business_category,
      public.user_profiles.business_category
    ),
    updated_at = now();

  return new;
end;
$$;
comment on function public.handle_new_auth_user() is
  'Creates user_profiles from auth.users signup metadata (business/contact fields).';
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
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
  select case
    when coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'user_role', ''), 'none') = 'admin'
      then 'admin'
    else coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'user_role', ''), 'none')
  end;
$$;
comment on function public.auth_user_role() is
  'Role from JWT app_metadata. Admin is always effective.';
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
