-- Sensitive auth fields (user_role, privileges) separated from user_profiles.
-- Run on Supabase SQL editor after user_profiles_and_roles migration is applied.

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------
create type public.business_type as enum ('personal', 'wholesale', 'warehouse', 'franchise');
comment on type public.business_type is
  'Portal/access privileges. A user may hold one or more values.';

create type public.user_role as enum ('none', 'user', 'admin', 'partner');
comment on type public.user_role is
  'Application role: none (no access), user (default), admin, partner.';

-- ---------------------------------------------------------------------------
-- user_metadata table
-- ---------------------------------------------------------------------------
create table public.user_metadata (
  id uuid primary key references auth.users (id) on delete cascade,
  user_role public.user_role not null default 'user',
  membership_level integer not null default 0,
  privileges public.business_type[] not null default array['personal']::public.business_type[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_metadata_privileges_not_empty check (cardinality(privileges) >= 1)
);

comment on table public.user_metadata is
  'Privileged user auth state (role and portal privileges). Users may read their own row; only admins/service_role may write.';
comment on column public.user_metadata.privileges is
  'Granted portal privileges. Users may hold multiple values (e.g. personal + wholesale).';

create index user_metadata_user_role_idx on public.user_metadata (user_role);
create index user_metadata_privileges_idx on public.user_metadata using gin (privileges);

create trigger user_metadata_set_updated_at
  before update on public.user_metadata
  for each row
  execute function public.set_updated_at();

-- Normalize privileges: dedupe and sort for stable storage/comparison.
create or replace function public.normalize_user_metadata_privileges(
  input public.business_type[]
)
returns public.business_type[]
language sql
immutable
as $$
  select coalesce(
    (
      select array_agg(distinct privilege order by privilege)
      from unnest(coalesce(input, '{}'::public.business_type[])) as privilege
    ),
    '{}'::public.business_type[]
  );
$$;

comment on function public.normalize_user_metadata_privileges(public.business_type[]) is
  'Returns a sorted, deduplicated copy of a privileges array.';

-- True when the current user has every listed privilege on their metadata row.
create or replace function public.user_has_privileges(
  required public.business_type[]
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.user_metadata
    where id = auth.uid()
      and public.normalize_user_metadata_privileges(privileges)
        @> public.normalize_user_metadata_privileges(required)
  );
$$;

comment on function public.user_has_privileges(public.business_type[]) is
  'True when auth.uid() holds all privileges in required (subset check).';

create or replace function public.user_has_privilege(required public.business_type)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select public.user_has_privileges(array[required]);
$$;

comment on function public.user_has_privilege(public.business_type) is
  'True when auth.uid() holds the given privilege.';

-- Reject client-controlled privileged fields; only admins/service_role may set them on update
create or replace function public.enforce_user_metadata_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  new.privileges := public.normalize_user_metadata_privileges(new.privileges);

  if cardinality(new.privileges) < 1 then
    new.privileges := array['personal']::public.business_type[];
  end if;

  if tg_op = 'INSERT' then
    if auth.role() = 'service_role' or public.is_admin() then
      return new;
    end if;

    new.user_role := 'user'::public.user_role;
    new.privileges := array['personal']::public.business_type[];
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if auth.role() = 'service_role' or public.is_admin() then
      return new;
    end if;

    raise exception 'Only admins can change user metadata'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.enforce_user_metadata_privileged_fields() is
  'On insert: force user_role=user and privileges=[personal] unless admin/service_role. On update: admin/service_role only.';

create trigger user_metadata_enforce_privileged_fields
  before insert or update on public.user_metadata
  for each row
  execute function public.enforce_user_metadata_privileged_fields();

-- ---------------------------------------------------------------------------
-- Auth metadata sync (app_metadata for JWT claims — not raw_user_meta_data)
-- ---------------------------------------------------------------------------
create or replace function public.sync_auth_user_metadata(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta public.user_metadata;
  privileges_json jsonb;
begin
  select * into strict meta
  from public.user_metadata
  where id = target_user_id;

  select coalesce(jsonb_agg(privilege::text order by privilege::text), '[]'::jsonb)
  into privileges_json
  from unnest(meta.privileges) as privilege;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    - 'is_verified'
    || jsonb_build_object(
      'user_role', meta.user_role::text,
      'privileges', privileges_json
    )
  where id = target_user_id;
end;
$$;

comment on function public.sync_auth_user_metadata(uuid) is
  'Writes user_role and privileges into auth.users raw_app_meta_data (App Metadata in dashboard).';

-- ---------------------------------------------------------------------------
-- New auth user → default metadata row + JWT sync
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.user_metadata (id, user_role, privileges)
  values (
    new.id,
    'user'::public.user_role,
    array['personal']::public.business_type[]
  )
  on conflict (id) do nothing;

  -- Remove privileged keys if the client passed them in signUp(options.data)
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    - 'user_role'
    - 'is_verified'
    - 'privileges'
    - 'business_type'
  where id = new.id;

  perform public.sync_auth_user_metadata(new.id);

  return new;
end;
$$;

comment on function public.handle_new_auth_user_metadata() is
  'Creates user_metadata (user, personal) on signup, strips client role/privilege claims, syncs app_metadata.';

drop trigger if exists on_auth_user_created_metadata on auth.users;

create trigger on_auth_user_created_metadata
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user_metadata();

-- ---------------------------------------------------------------------------
-- Metadata change → auth JWT metadata
-- ---------------------------------------------------------------------------
create or replace function public.handle_user_metadata_auth_sync()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_role is distinct from old.user_role
      or new.privileges is distinct from old.privileges
    then
      perform public.sync_auth_user_metadata(new.id);
    end if;
  end if;

  return new;
end;
$$;

create trigger on_user_metadata_auth_sync
  after update of user_role, privileges on public.user_metadata
  for each row
  execute function public.handle_user_metadata_auth_sync();

-- Callable after admin grants privileges (mirrors user_metadata → app_metadata)
create or replace function public.sync_user_auth_metadata(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    raise exception 'Only admins can sync auth metadata'
      using errcode = '42501';
  end if;

  perform public.sync_auth_user_metadata(target_user_id);
end;
$$;

comment on function public.sync_user_auth_metadata(uuid) is
  'Mirrors user_metadata role/privileges into auth.users app_metadata.';

-- JWT role helper: admin always effective; others use stored user_role (no verification gate).
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

-- ---------------------------------------------------------------------------
-- Row Level Security — users read-only on own row; admins write
-- ---------------------------------------------------------------------------
alter table public.user_metadata enable row level security;

create policy "Users can view own metadata"
  on public.user_metadata
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Admins can view user metadata"
  on public.user_metadata
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert user metadata"
  on public.user_metadata
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update user metadata"
  on public.user_metadata
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete user metadata"
  on public.user_metadata
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants — table privileges required before RLS; policies restrict who may use them
-- ---------------------------------------------------------------------------
revoke all on public.user_metadata from anon;
revoke all on public.user_metadata from authenticated;

grant select, insert, update, delete on public.user_metadata to authenticated;
grant all on public.user_metadata to service_role;
grant usage on type public.business_type to anon, authenticated, service_role;
grant execute on function public.normalize_user_metadata_privileges(public.business_type[])
  to anon, authenticated, service_role;
grant execute on function public.user_has_privilege(public.business_type)
  to anon, authenticated, service_role;
grant execute on function public.user_has_privileges(public.business_type[])
  to anon, authenticated, service_role;
grant execute on function public.sync_auth_user_metadata(uuid)
  to service_role;
grant execute on function public.sync_user_auth_metadata(uuid)
  to authenticated, service_role;


-- Admin lookup for auth.users email confirmation state (pending partner review).

create or replace function public.get_users_email_verified(target_user_ids uuid[])
returns table (
  user_id uuid,
  email_confirmed_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can look up email verification status';
  end if;

  return query
  select u.id, u.email_confirmed_at
  from auth.users as u
  where u.id = any(coalesce(target_user_ids, '{}'::uuid[]));
end;
$$;

comment on function public.get_users_email_verified(uuid[]) is
  'Returns email_confirmed_at for the given user ids. Admin only.';

grant execute on function public.get_users_email_verified(uuid[]) to authenticated;
