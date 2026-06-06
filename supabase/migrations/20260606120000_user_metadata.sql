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
  'Privileged user auth state (role, verification). Not readable by regular users; admin/service_role only.';

create index user_metadata_user_role_idx on public.user_metadata (user_role);
create index user_metadata_is_verified_idx on public.user_metadata (is_verified);

create trigger user_metadata_set_updated_at
  before update on public.user_metadata
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth metadata sync (app metadata for JWT claims)
-- ---------------------------------------------------------------------------
create or replace function public.sync_auth_user_role_metadata(
  target_user_id uuid,
  role public.user_role,
  verified boolean default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  role_text text := role::text;
  app_metadata jsonb := jsonb_build_object('user_role', role_text);
begin
  if verified is not null then
    app_metadata := app_metadata || jsonb_build_object('is_verified', verified);
  end if;

  update auth.users
  set
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || app_metadata,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('user_role', role_text)
  where id = target_user_id;
end;
$$;

comment on function public.sync_auth_user_role_metadata(uuid, public.user_role, boolean) is
  'Writes user_role (and optional is_verified) into auth.users JWT metadata.';

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

  perform public.sync_auth_user_role_metadata(new.id, 'user'::public.user_role, false);

  return new;
end;
$$;

comment on function public.handle_new_auth_user_metadata() is
  'Creates user_metadata with default role on signup and mirrors role into auth JWT metadata.';

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

-- ---------------------------------------------------------------------------
-- Row Level Security — admins and service_role only
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
-- Grants — no direct access for anon; authenticated gated by RLS above
-- ---------------------------------------------------------------------------
revoke all on public.user_metadata from anon;
revoke all on public.user_metadata from authenticated;

grant select, insert, update, delete on public.user_metadata to authenticated;
grant all on public.user_metadata to service_role;
grant execute on function public.sync_auth_user_role_metadata(uuid, public.user_role)
  to service_role;
