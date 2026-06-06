-- Sensitive auth fields (user_role, is_verified) separated from user_profiles.
-- Run on Supabase SQL editor after user_profiles_and_roles migration is applied.

-- ---------------------------------------------------------------------------
-- user_metadata table
-- ---------------------------------------------------------------------------
create table public.user_metadata (
  id uuid primary key references auth.users (id) on delete cascade,
  user_role public.user_role not null default 'user',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_metadata is
  'Privileged user auth state (role, verification). Users may read their own row; only admins/service_role may write.';

create index user_metadata_user_role_idx on public.user_metadata (user_role);
create index user_metadata_is_verified_idx on public.user_metadata (is_verified);

create trigger user_metadata_set_updated_at
  before update on public.user_metadata
  for each row
  execute function public.set_updated_at();

-- Reject client-controlled privileged fields; only admins/service_role may set them on update
create or replace function public.enforce_user_metadata_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if auth.role() = 'service_role' or public.is_admin() then
      return new;
    end if;

    new.user_role := 'user'::public.user_role;
    new.is_verified := false;
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
  'On insert: force is_verified=false and user_role=user unless admin/service_role. On update: admin/service_role only.';

create trigger user_metadata_enforce_privileged_fields
  before insert or update on public.user_metadata
  for each row
  execute function public.enforce_user_metadata_privileged_fields();

-- ---------------------------------------------------------------------------
-- Auth metadata sync (app_metadata for JWT claims — not raw_user_meta_data)
-- ---------------------------------------------------------------------------
create or replace function public.sync_auth_user_role_metadata(
  target_user_id uuid,
  role public.user_role,
  verified boolean
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
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'user_role', role_text,
      'is_verified', verified
    )
  where id = target_user_id;
end;
$$;

comment on function public.sync_auth_user_role_metadata(uuid, public.user_role, boolean) is
  'Writes user_role and is_verified into auth.users raw_app_meta_data (App Metadata in dashboard).';

-- ---------------------------------------------------------------------------
-- New auth user → default metadata row + JWT role sync
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.user_metadata (id, user_role, is_verified)
  values (new.id, 'user'::public.user_role, false)
  on conflict (id) do nothing;

  -- Remove privileged keys if the client passed them in signUp(options.data)
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    - 'user_role'
    - 'is_verified'
  where id = new.id;

  perform public.sync_auth_user_role_metadata(new.id, 'user'::public.user_role, false);

  return new;
end;
$$;

comment on function public.handle_new_auth_user_metadata() is
  'Creates user_metadata (user/false) on signup, strips client role/verified claims, syncs app_metadata.';

drop trigger if exists on_auth_user_created_metadata on auth.users;

create trigger on_auth_user_created_metadata
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user_metadata();

-- ---------------------------------------------------------------------------
-- Role change → auth JWT metadata
-- ---------------------------------------------------------------------------
create or replace function public.handle_user_metadata_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_role is distinct from old.user_role
      or new.is_verified is distinct from old.is_verified
    then
      perform public.sync_auth_user_role_metadata(
        new.id,
        new.user_role,
        new.is_verified
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger on_user_metadata_role_change
  after update of user_role, is_verified on public.user_metadata
  for each row
  execute function public.handle_user_metadata_role_change();

-- Explicit sync callable after admin confirms a partner (mirrors user_metadata → app_metadata)
create or replace function public.sync_user_auth_metadata(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta public.user_metadata;
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    raise exception 'Only admins can sync auth metadata'
      using errcode = '42501';
  end if;

  select * into strict meta
  from public.user_metadata
  where id = target_user_id;

  perform public.sync_auth_user_role_metadata(
    meta.id,
    meta.user_role,
    meta.is_verified
  );
end;
$$;

comment on function public.sync_user_auth_metadata(uuid) is
  'Mirrors user_metadata role/verification into auth.users app_metadata.';

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
grant execute on function public.sync_auth_user_role_metadata(uuid, public.user_role, boolean)
  to service_role;
grant execute on function public.sync_user_auth_metadata(uuid)
  to authenticated, service_role;
