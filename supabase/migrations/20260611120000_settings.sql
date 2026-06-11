-- Site-wide key/value settings (non-sensitive; fetched as a whole).

create table public.settings (
  key text primary key,
  value text not null,
  description text,
  constraint settings_key_length check (char_length(trim(key)) between 1 and 128)
);

comment on table public.settings is
  'Public site configuration as key/value pairs. Not for sensitive data.';
comment on column public.settings.key is
  'Stable setting identifier (e.g. store_hours_banner).';
comment on column public.settings.value is
  'Setting value consumed by the public site and admin apps.';
comment on column public.settings.description is
  'Internal documentation for admins; not exposed via the Data API.';

alter table public.settings enable row level security;

create policy "Anyone can read settings"
  on public.settings
  for select
  to anon, authenticated
  using (true);

grant select (key, value) on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;
grant all on public.settings to service_role;

create policy "Admins can read settings"
  on public.settings
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert settings"
  on public.settings
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update settings"
  on public.settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete settings"
  on public.settings
  for delete
  to authenticated
  using (public.is_admin());
